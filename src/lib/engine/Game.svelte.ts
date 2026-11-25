import { Gameboard } from "./Gameboard";
import type { position } from "./Gameboard";
import type { pieceColor } from "./Piece";
import { Rules } from "./Rules";
import type { move } from "./Rules";

export class Game {
  #gameboard = new Gameboard();
  #rules = new Rules();
  #currentTurn = $state<pieceColor>("blue");
  #winner = $state<pieceColor | null>(null);

  get gameboard(): Gameboard {
    return this.#gameboard;
  }

  get currentTurn(): pieceColor {
    return this.#currentTurn;
  }

  get winner(): pieceColor | null {
    return this.#winner;
  }

  legalMoves(position: position): move[] {
    return this.#rules.legalMoves(this.#gameboard, position);
  }

  #switchTurn(): void {
    this.#currentTurn = this.#currentTurn === "blue" ? "red" : "blue";
  }

  tryMove(position: position, newPosition: position): boolean {
    // ignore move if not players turn
    const piece = this.gameboard.pieceAt(position);
    if (piece?.colour !== this.#currentTurn) return false;

    // ignore move if illegal
    const move = this.legalMoves(position).find(
      (move) =>
        move.newPosition.row === newPosition.row && move.newPosition.column === newPosition.column,
    );
    if (!move) return false;

    // ignore move if the game is won
    if (this.#winner) return false;

    this.gameboard.move(move);

    this.#winner = this.#rules.winner(this.#gameboard, move);
    if (!this.winner) this.#switchTurn();

    return true;
  }
}
