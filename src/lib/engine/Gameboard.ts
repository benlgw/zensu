import { Piece } from "./Piece";
import type { pieceRank, pieceColor } from "./Piece";

type cell = Piece | null;
export type board = cell[][];
type posiiton = { row: number; column: number };

export class Gameboard {
  #gameboard: cell[][];

  constructor() {
    this.#gameboard = this.initBoard();
  }

  get board(): board {
    return this.#gameboard;
  }

  initBoard(): board {
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

  move(oldPosiiton: posiiton, newPosition: posiiton) {
    for (const { row, column } of [oldPosiiton, newPosition]) {
      if (row < 0 || row > 9) {
        throw new Error("Row must be between 0 and 8, inclusive");
      }
      if (column < 0 || column > 9) {
        throw new Error("Column must be between 0 and 8, inclusive");
      }
    }

    const piece = this.#gameboard[oldPosiiton.row][oldPosiiton.column];
    this.#gameboard[oldPosiiton.row][oldPosiiton.column] = null;
    this.#gameboard[newPosition.row][newPosition.column] = piece;
  }
}

// ["R", "R", "R", "R", "R", "R"],  // 0
// ["r", "r", "r", "r", "r", "r"],  // 1
// [ "",  "",  "",  "",  "",  ""],  // 2
// [ "",  "",  "",  "",  "",  ""],  // 3
// [ "",  "",  "",  "",  "",  ""],  // 4
// [ "",  "",  "",  "",  "",  ""],  // 5
// [ "",  "",  "",  "",  "",  ""],  // 6
// ["b", "b", "b", "b", "b", "b"],  // 7
// ["B", "B", "B", "B", "B", "B"],  // 8
// //0    1    2    3    4    5
