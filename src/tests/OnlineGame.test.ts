import { afterEach, describe, expect, test, vi } from "vitest";
import type { position } from "../lib/engine/Gameboard.svelte";
import { OnlineGame } from "../lib/multiplayer/OnlineGame";
import type { Connection } from "../lib/multiplayer/OnlineGame";
import type { Role, Status } from "../lib/multiplayer/P2P.svelte";
import { position as at } from "./helpers";

/**
 * One end of an in-memory connection, standing in for P2P. Like the real one,
 * messages are routed by `type`, delivery is asynchronous, and data is copied
 * through JSON so only plain data crosses.
 */
class FakeConnection implements Connection {
  other: FakeConnection | null = null;
  status: Status = "connected";
  sent: unknown[] = [];
  #handlers = new Map<string, Set<(message: any) => void>>();

  constructor(public role: Role) {}

  send(data: unknown): void {
    this.sent.push(data);
    const copy = JSON.parse(JSON.stringify(data));
    const other = this.other!;
    queueMicrotask(() => other.receive(copy));
  }

  on<T extends { type: string }>(type: string, handler: (message: T) => void): () => void {
    if (!this.#handlers.has(type)) this.#handlers.set(type, new Set());
    this.#handlers.get(type)!.add(handler);
    return () => this.#handlers.get(type)!.delete(handler);
  }

  /** Deliver a message to this end, as if the other player sent it. */
  receive(message: { type: string }): void {
    this.#handlers.get(message.type)?.forEach((handler) => handler(message));
  }
}

function connectedPair() {
  const hostConnection = new FakeConnection("host");
  const guestConnection = new FakeConnection("guest");
  hostConnection.other = guestConnection;
  guestConnection.other = hostConnection;
  return {
    host: new OnlineGame(hostConnection),
    guest: new OnlineGame(guestConnection),
    hostConnection,
    guestConnection,
  };
}

/**
 * Wait for sent messages to arrive. FakeConnection delivers with queueMicrotask and
 * microtasks run in order, so anything sent before this call arrives before it resolves.
 */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

/** The board as text, for comparing the two players' boards. */
function snapshot(online: OnlineGame): string {
  return online.game.gameboard.grid
    .map((row) => row.map((piece) => (piece ? `${piece.colour[0]}${piece.rank}` : "..")).join(" "))
    .join("\n");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("colours", () => {
  test("the host plays blue and the guest plays red", () => {
    const { host, guest } = connectedPair();
    expect(host.localColour).toBe("blue");
    expect(guest.localColour).toBe("red");
  });

  test("only the host can move first", () => {
    const { host, guest } = connectedPair();
    expect(host.movableColour).toBe("blue");
    expect(guest.movableColour).toBeNull();
  });
});

describe("sending moves", () => {
  test("a successful move is sent with oldPosition and newPosition", () => {
    const { host, hostConnection } = connectedPair();

    expect(host.play(at(7, 0), at(6, 0))).toBe(true);

    expect(host.game.gameboard.pieceAt(at(6, 0))?.colour).toBe("blue");
    expect(hostConnection.sent).toEqual([
      { type: "move", oldPosition: at(7, 0), newPosition: at(6, 0) },
    ]);
  });

  test("an illegal move isn't applied or sent", () => {
    const { host, hostConnection } = connectedPair();

    expect(host.play(at(7, 0), at(5, 0))).toBe(false); // a blue 1 can't move up 2

    expect(hostConnection.sent).toEqual([]);
    expect(host.movableColour).toBe("blue"); // still blue's turn
  });

  test("you can't move on the opponent's turn", () => {
    const { guest, guestConnection } = connectedPair();

    expect(guest.play(at(1, 0), at(2, 0))).toBe(false); // red tries to go first

    expect(guestConnection.sent).toEqual([]);
    expect(guest.game.gameboard.pieceAt(at(2, 0))).toBeNull();
  });

  test("you can't move the opponent's pieces", () => {
    const { host, hostConnection } = connectedPair();

    expect(host.play(at(1, 0), at(2, 0))).toBe(false); // blue moving a red piece

    expect(hostConnection.sent).toEqual([]);
  });

  test("you can't move twice in a row", () => {
    const { host, hostConnection } = connectedPair();
    host.play(at(7, 0), at(6, 0));

    expect(host.play(at(7, 1), at(6, 1))).toBe(false);
    expect(hostConnection.sent).toHaveLength(1);
  });
});

describe("receiving moves", () => {
  test("the opponent's move is applied and the turn passes back", async () => {
    const { host, guest } = connectedPair();
    host.play(at(7, 0), at(6, 0));
    await flush();

    expect(guest.game.gameboard.pieceAt(at(6, 0))?.colour).toBe("blue");
    expect(guest.game.gameboard.pieceAt(at(7, 0))).toBeNull();
    expect(guest.movableColour).toBe("red");
    expect(host.movableColour).toBeNull();
  });

  test("players take turns and the boards stay the same", async () => {
    const { host, guest } = connectedPair();

    expect(host.play(at(7, 0), at(6, 0))).toBe(true);
    await flush();
    expect(guest.play(at(1, 0), at(2, 0))).toBe(true);
    await flush();
    expect(host.play(at(7, 1), at(6, 1))).toBe(true);
    await flush();

    expect(snapshot(guest)).toBe(snapshot(host));
    expect(guest.movableColour).toBe("red");
  });

  test("a move received on your own turn is ignored, and nothing is sent back", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, hostConnection } = connectedPair();

    // It's blue's (the host's) turn, but a move arrives from red.
    hostConnection.receive({ type: "move", oldPosition: at(1, 0), newPosition: at(2, 0) } as any);

    expect(host.game.gameboard.pieceAt(at(2, 0))).toBeNull();
    expect(host.movableColour).toBe("blue");
    expect(hostConnection.sent).toEqual([]);
    expect(error).toHaveBeenCalled();
  });

  test("an illegal received move is ignored: it stays the opponent's turn and nothing is sent", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { host, guest, guestConnection } = connectedPair();
    host.play(at(7, 0), at(6, 0));
    await flush();
    const before = snapshot(host);

    // Red's turn; a red 1 can't move 3 squares.
    const hostConnection = guestConnection.other!;
    hostConnection.receive({ type: "move", oldPosition: at(1, 0), newPosition: at(4, 0) } as any);

    expect(snapshot(host)).toBe(before);
    expect(host.game.currentTurn).toBe("red");
    expect(hostConnection.sent).toHaveLength(1); // only blue's own earlier move
    expect(guest.movableColour).toBe("red");
    expect(error).toHaveBeenCalled();
  });
});

describe("the game stopping", () => {
  test("a full random game ends with the same board and winner for both players", async () => {
    const error = vi.spyOn(console, "error");

    for (let round = 0; round < 20; round++) {
      const { host, guest } = connectedPair();

      // Random games usually end in ~100 moves but can run to several hundred.
      for (let turn = 0; turn < 5000 && !host.game.winner; turn++) {
        const mover = host.movableColour ? host : guest;
        const moves = allLegalMoves(mover);
        expect(moves.length).toBeGreaterThan(0);

        const { oldPosition, newPosition } = moves[Math.floor(Math.random() * moves.length)];
        expect(mover.play(oldPosition, newPosition)).toBe(true);
        await flush();

        expect(snapshot(guest)).toBe(snapshot(host));
      }

      expect(host.game.winner).not.toBeNull();
      expect(guest.game.winner).toBe(host.game.winner);
      expect(host.movableColour).toBeNull();
      expect(guest.movableColour).toBeNull();
    }

    expect(error).not.toHaveBeenCalled();
  });

  test("when the opponent leaves, nobody can move", () => {
    const { host, hostConnection } = connectedPair();
    hostConnection.status = "disconnected";

    expect(host.movableColour).toBeNull();
    expect(host.play(at(7, 0), at(6, 0))).toBe(false);
    expect(hostConnection.sent).toEqual([]);
  });

  test("after dispose, incoming moves are no longer applied", async () => {
    const { host, guest } = connectedPair();
    guest.dispose();

    host.play(at(7, 0), at(6, 0));
    await flush();

    expect(guest.game.gameboard.pieceAt(at(6, 0))).toBeNull();
  });
});

/** Every legal move for the player whose turn it is. */
function allLegalMoves(online: OnlineGame): { oldPosition: position; newPosition: position }[] {
  const { game } = online;
  const moves: { oldPosition: position; newPosition: position }[] = [];
  game.gameboard.grid.forEach((row, r) =>
    row.forEach((piece, c) => {
      if (piece?.colour !== game.currentTurn) return;
      for (const move of game.legalMoves(at(r, c))) {
        moves.push({ oldPosition: at(r, c), newPosition: move.newPosition });
      }
    }),
  );
  return moves;
}
