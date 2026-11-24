import { Piece } from "./Piece";
import type { pieceRank, pieceColor } from "./Piece";

type cell = Piece | null;

export class Board {
  #gameboard: cell[][];

  constructor() {
    this.#gameboard = this.initBoard();
  }

  get board(): cell[][] {
    return this.#gameboard;
  }

  initBoard(): cell[][] {
    return [
      this.createRow(2, "red"),
      this.createRow(1, "red"),
      ...Array.from({ length: 5 }, () => this.createEmptyRow()),
      this.createRow(1, "blue"),
      this.createRow(2, "blue"),
    ];
  }

  createRow(rank: pieceRank, colour: pieceColor): Piece[] {
    return Array.from({ length: 6 }, () => new Piece(rank, colour));
  }

  createEmptyRow(): null[] {
    return Array.from({ length: 6 }, () => null);
  }
}
