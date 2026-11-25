import { Piece } from "./Piece";
import type { pieceRank, pieceColor } from "./Piece";
import type { move } from "./Rules";

type cell = Piece | null;
export type grid = cell[][];
export type position = { row: number; column: number };

const ROWS = 9;
const COLUMNS = 6;

export class Gameboard {
  // $state makes the grid reactive: Svelte sees in-place changes like
  // this.#gameboard[row][column] = piece and re-renders the affected cells.
  #gameboard = $state<grid>(this.initBoard());

  get grid(): grid {
    return this.#gameboard;
  }

  initBoard(): grid {
    return [
      this.createRow(2, "red"),
      this.createRow(1, "red"),
      ...Array.from({ length: ROWS - 4 }, () => this.createEmptyRow()),
      this.createRow(1, "blue"),
      this.createRow(2, "blue"),
    ];
  }

  createRow(rank: pieceRank, colour: pieceColor): Piece[] {
    return Array.from({ length: COLUMNS }, () => new Piece(rank, colour));
  }

  createEmptyRow(): null[] {
    return Array.from({ length: COLUMNS }, () => null);
  }

  pieceAt(position: position): Piece | null {
    return this.#gameboard[position.row][position.column];
  }

  positionExists(position: position): boolean {
    return (
      position.row >= 0 && position.row < ROWS && position.column >= 0 && position.column < COLUMNS
    );
  }

  playerHasPieces(colour: pieceColor): boolean {
    return this.#gameboard.some((row) => row.some((piece) => piece?.colour === colour));
  }

  move(move: move): void {
    this.#gameboard[move.oldPosition.row][move.oldPosition.column] = null;
    for (const capture of move.captured) {
      this.#gameboard[capture.position.row][capture.position.column] = null;
    }
    this.#gameboard[move.newPosition.row][move.newPosition.column] = move.piece;
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
