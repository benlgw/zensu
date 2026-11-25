import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * A minimal in-memory stand-in for PeerJS. Real PeerJS needs a browser, WebRTC and
 * the PeerJS server, so these tests check P2P's own logic, not the network.
 *
 * Matches the real library where it matters: destroy() closes the peer's open
 * connections, and closing an open connection emits "close" synchronously.
 */
const { FakePeer, FakeConnection } = vi.hoisted(() => {
  type Listener = (...args: any[]) => void;

  class Emitter {
    #listeners = new Map<string, Set<Listener>>();
    on(event: string, listener: Listener) {
      if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
      this.#listeners.get(event)!.add(listener);
      return this;
    }
    off(event: string, listener: Listener) {
      this.#listeners.get(event)?.delete(listener);
      return this;
    }
    emit(event: string, ...args: unknown[]) {
      this.#listeners.get(event)?.forEach((listener) => listener(...args));
    }
  }

  class FakeConnection extends Emitter {
    open = false;
    sent: unknown[] = [];
    constructor(
      public peer: string,
      public options?: unknown,
    ) {
      super();
    }
    send(data: unknown) {
      this.sent.push(data);
    }
    close() {
      if (!this.open) return;
      this.open = false;
      this.emit("close");
    }
    // --- test controls ---
    simulateOpen() {
      this.open = true;
      this.emit("open");
    }
    simulateData(data: unknown) {
      this.emit("data", data);
    }
  }

  class FakePeer extends Emitter {
    static instances: FakePeer[] = [];
    destroyed = false;
    connections: FakeConnection[] = [];
    constructor(public id?: string) {
      super();
      FakePeer.instances.push(this);
    }
    connect(id: string, options?: unknown) {
      const connection = new FakeConnection(id, options);
      this.connections.push(connection);
      return connection;
    }
    destroy() {
      this.destroyed = true;
      this.connections.forEach((connection) => connection.close());
    }
    // --- test controls ---
    simulateOpen() {
      this.emit("open", this.id);
    }
    simulateIncoming(from = "guest-id") {
      const connection = new FakeConnection(from);
      this.connections.push(connection);
      this.emit("connection", connection);
      return connection;
    }
    simulateError(type: string, message = `${type} error`) {
      this.emit("error", { type, message });
    }
  }

  return { FakePeer, FakeConnection };
});

vi.mock("peerjs", () => ({ default: FakePeer }));

// Imported after the mock is registered (vi.mock is hoisted above imports).
import { P2P } from "../lib/multiplayer/P2P.svelte";

const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

let unloadListeners: (() => void)[];

beforeEach(() => {
  FakePeer.instances = [];
  unloadListeners = [];
  // Tests run in Node, which has no `window`. P2P only uses it for beforeunload.
  vi.stubGlobal("window", {
    addEventListener: (event: string, listener: () => void) => {
      if (event === "beforeunload") unloadListeners.push(listener);
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const latestPeer = () => FakePeer.instances.at(-1)!;

/** A host with a guest connected. */
function connectedHost() {
  const p2p = new P2P();
  p2p.host();
  latestPeer().simulateOpen();
  const connection = latestPeer().simulateIncoming();
  connection.simulateOpen();
  return { p2p, peer: latestPeer(), connection };
}

/** A guest connected to a host. */
function connectedGuest(code = "K7Q2XP") {
  const p2p = new P2P();
  p2p.join(code);
  const peer = latestPeer();
  peer.simulateOpen();
  const connection = peer.connections[0];
  connection.simulateOpen();
  return { p2p, peer, connection };
}

describe("hosting", () => {
  test("registers a prefixed short code as the peer ID", () => {
    const p2p = new P2P();
    p2p.host();

    expect(p2p.role).toBe("host");
    expect(p2p.status).toBe("creating");
    expect(latestPeer().id).toMatch(/^zensu-/);
    expect(latestPeer().id!.slice("zensu-".length)).toMatch(CODE_PATTERN);
  });

  test("shows the code (without the prefix) once the PeerJS server confirms it", () => {
    const p2p = new P2P();
    p2p.host();
    expect(p2p.code).toBe(""); // not until the ID is confirmed

    latestPeer().simulateOpen();

    expect(p2p.status).toBe("waiting");
    expect(p2p.code).toMatch(CODE_PATTERN);
    expect(latestPeer().id).toBe(`zensu-${p2p.code}`);
  });

  test("codes only use the readable character set", () => {
    for (let i = 0; i < 200; i++) {
      new P2P().host();
      expect(latestPeer().id!.slice("zensu-".length)).toMatch(CODE_PATTERN);
    }
  });

  test("tries a new code if the ID is already taken", () => {
    const p2p = new P2P();
    p2p.host();
    const first = latestPeer();

    first.simulateError("unavailable-id");

    expect(FakePeer.instances).toHaveLength(2);
    expect(first.destroyed).toBe(true);
    expect(p2p.status).toBe("creating");
    expect(p2p.role).toBe("host");
  });

  test("gives up after 5 attempts", () => {
    const p2p = new P2P();
    p2p.host();
    for (let i = 0; i < 5; i++) latestPeer().simulateError("unavailable-id", "ID is taken");

    expect(FakePeer.instances).toHaveLength(5);
    expect(p2p.status).toBe("error");
    expect(p2p.error).toBe("ID is taken");
  });

  test("becomes connected when a guest's connection opens", () => {
    const p2p = new P2P();
    p2p.host();
    latestPeer().simulateOpen();
    const connection = latestPeer().simulateIncoming();
    expect(p2p.status).toBe("waiting"); // not open yet

    connection.simulateOpen();

    expect(p2p.status).toBe("connected");
  });

  test("turns away a second guest and keeps the first", () => {
    const { p2p, peer, connection: first } = connectedHost();

    const second = peer.simulateIncoming("intruder");
    second.simulateOpen();

    expect(second.open).toBe(false); // closed as soon as it opened
    expect(first.open).toBe(true);
    expect(p2p.status).toBe("connected");

    p2p.send("still here");
    expect(first.sent).toEqual(["still here"]);
    expect(second.sent).toEqual([]);
  });
});

describe("joining", () => {
  test("connects to the prefixed code once its own peer is ready", () => {
    const p2p = new P2P();
    p2p.join("K7Q2XP");
    const peer = latestPeer();

    expect(p2p.role).toBe("guest");
    expect(p2p.status).toBe("joining");
    expect(peer.id).toBeUndefined(); // the guest gets a random ID
    expect(peer.connections).toHaveLength(0); // waits for the peer to open first

    peer.simulateOpen();

    expect(peer.connections).toHaveLength(1);
    expect(peer.connections[0].peer).toBe("zensu-K7Q2XP");
    expect(peer.connections[0].options).toEqual({ reliable: true, serialization: "json" });
  });

  test.each([
    ["lowercase", "k7q2xp"],
    ["surrounding spaces", "  K7Q2XP  "],
    ["the prefix included", "zensu-K7Q2XP"],
    ["all of the above", "  ZENSU-k7q2xp "],
  ])("accepts a code with %s", (_, input) => {
    new P2P().join(input);
    latestPeer().simulateOpen();
    expect(latestPeer().connections[0].peer).toBe("zensu-K7Q2XP");
  });

  test("an empty code is refused without creating a peer", () => {
    const p2p = new P2P();
    p2p.join("   ");

    expect(FakePeer.instances).toHaveLength(0);
    expect(p2p.error).toBe("Enter a game code");
    expect(p2p.status).toBe("idle");
  });

  test("a code with no game behind it gives a friendly error", () => {
    const p2p = new P2P();
    p2p.join("k7q2xp");
    latestPeer().simulateOpen();
    latestPeer().simulateError("peer-unavailable");

    expect(p2p.status).toBe("error");
    expect(p2p.error).toBe("No game found with code K7Q2XP");
    expect(p2p.role).toBeNull();
  });

  test("other errors pass PeerJS's message through", () => {
    const p2p = new P2P();
    p2p.join("K7Q2XP");
    latestPeer().simulateError("network", "Lost connection to server");

    expect(p2p.status).toBe("error");
    expect(p2p.error).toBe("Lost connection to server");
  });

  test("becomes connected when the connection opens", () => {
    const { p2p } = connectedGuest();
    expect(p2p.status).toBe("connected");
  });
});

describe("messaging", () => {
  test("send delivers data once connected", () => {
    const { p2p, connection } = connectedGuest();
    p2p.send({ type: "move", from: { row: 7, column: 0 }, to: { row: 6, column: 0 } });

    expect(connection.sent).toEqual([
      { type: "move", from: { row: 7, column: 0 }, to: { row: 6, column: 0 } },
    ]);
  });

  test("send does nothing before the connection is open", () => {
    const p2p = new P2P();
    p2p.join("K7Q2XP");
    latestPeer().simulateOpen();

    p2p.send("too early");

    expect(latestPeer().connections[0].sent).toEqual([]);
  });

  test("onMessage receives data from the other player", () => {
    const { p2p, connection } = connectedHost();
    const received: unknown[] = [];
    p2p.onMessage((data) => received.push(data));

    connection.simulateData({ type: "chat", text: "hi" });

    expect(received).toEqual([{ type: "chat", text: "hi" }]);
  });

  test("every listener receives each message", () => {
    const { p2p, connection } = connectedHost();
    const a: unknown[] = [];
    const b: unknown[] = [];
    p2p.onMessage((data) => a.push(data));
    p2p.onMessage((data) => b.push(data));

    connection.simulateData("hello");

    expect(a).toEqual(["hello"]);
    expect(b).toEqual(["hello"]);
  });

  test("messages that arrive before anyone listens are delivered, in order, to the first listener", () => {
    const { p2p, connection } = connectedHost();
    connection.simulateData(1);
    connection.simulateData(2);

    const first: unknown[] = [];
    p2p.onMessage((data) => first.push(data));
    const second: unknown[] = [];
    p2p.onMessage((data) => second.push(data));

    expect(first).toEqual([1, 2]);
    expect(second).toEqual([]); // the buffer is only delivered once

    connection.simulateData(3);
    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual([3]);
  });

  test("the function returned by onMessage stops that listener", () => {
    const { p2p, connection } = connectedHost();
    const received: unknown[] = [];
    const stop = p2p.onMessage((data) => received.push(data));

    connection.simulateData("before");
    stop();
    connection.simulateData("after");

    expect(received).toEqual(["before"]);
  });
});

describe("disconnecting", () => {
  test("the other player leaving sets status to disconnected", () => {
    const { p2p, connection } = connectedGuest();
    connection.close(); // the remote side closing fires "close" here too

    expect(p2p.status).toBe("disconnected");
  });

  test("leave destroys the peer and resets everything", () => {
    const { p2p, peer } = connectedHost();
    p2p.leave();

    expect(peer.destroyed).toBe(true);
    expect(p2p.status).toBe("idle"); // not "disconnected", even though the connection closed
    expect(p2p.role).toBeNull();
    expect(p2p.code).toBe("");
    expect(p2p.error).toBe("");
  });

  test("leave drops buffered messages", () => {
    const { p2p, connection } = connectedHost();
    connection.simulateData("stale");
    p2p.leave();

    const received: unknown[] = [];
    p2p.onMessage((data) => received.push(data));
    expect(received).toEqual([]);
  });

  test("server errors after connecting don't end the game", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { p2p, peer, connection } = connectedGuest();

    peer.simulateError("network", "Lost connection to server");

    expect(p2p.status).toBe("connected");
    expect(connection.open).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  test("closing the tab destroys the peer", () => {
    const { peer } = connectedHost();
    unloadListeners.forEach((listener) => listener());
    expect(peer.destroyed).toBe(true);
  });

  test("hosting again starts fresh", () => {
    const { p2p, peer } = connectedHost();
    p2p.host();

    expect(peer.destroyed).toBe(true);
    expect(latestPeer()).not.toBe(peer);
    expect(p2p.status).toBe("creating");
    expect(p2p.code).toBe("");
  });
});
