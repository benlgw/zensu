import { Game } from "../engine/Game.svelte";
import type { position } from "../engine/Gameboard.svelte";
import type { pieceColor } from "../engine/Piece";
import type { Role, Status } from "./P2P.svelte";

type MoveMessage = { type: "move"; oldPosition: position; newPosition: position };

export interface Connection {
  role: Role | null;
  status: Status;
  send(data: unknown): void;
  on<T extends { type: string }>(type: string, handler: (message: T) => void): () => void;
}

export class OnlineGame {
  game = new Game();
  localColour: pieceColor;

  #connection: Connection;
  #stopListening: () => void;

  constructor(connection: Connection) {
    this.#connection = connection;
    this.localColour = connection.role === "host" ? "blue" : "red";
    this.#stopListening = connection.on<MoveMessage>("move", (message) =>
      this.#receiveMove(message),
    );
  }

  get movableColour(): pieceColor | null {
    if (this.#connection.status !== "connected") return null; // the opponent left: the game stops
    if (this.game.winner) return null;
    return this.game.currentTurn === this.localColour ? this.localColour : null;
  }

  play(oldPosition: position, newPosition: position): boolean {
    if (this.movableColour === null) return false;
    if (!this.game.tryMove(oldPosition, newPosition)) return false;

    const message: MoveMessage = { type: "move", oldPosition, newPosition };
    this.#connection.send(message);
    return true;
  }

  dispose(): void {
    this.#stopListening();
  }

  #receiveMove(message: MoveMessage): void {
    if (
      this.game.currentTurn === this.localColour ||
      !this.game.tryMove(message.oldPosition, message.newPosition)
    ) {
      console.error("Couldn't apply the opponent's move:", message);
    }
  }
}
