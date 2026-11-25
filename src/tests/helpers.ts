import type { Gameboard, position as Position } from "../lib/engine/Gameboard";
import type { Piece } from "../lib/engine/Piece";
import type { move } from "../lib/engine/Rules";

export const position = (row: number, column: number): Position => ({ row, column });

/**
 * Builds a move by hand, without going through Rules. Lets tests set up any move
 * (legal or not) to check what Gameboard.move and Rules.winner do with it.
 */
export function makeMove(
  gameboard: Gameboard,
  from: Position,
  to: Position,
  captured: Position[] = [],
): move {
  return {
    oldPosition: from,
    newPosition: to,
    piece: gameboard.pieceAt(from)!,
    captured: captured.map((position) => ({ piece: gameboard.pieceAt(position)!, position })),
  };
}

/** Test setup only: put a piece (or null) straight onto a square. */
export function place(gameboard: Gameboard, at: Position, piece: Piece | null): void {
  gameboard.gameboard[at.row][at.column] = piece;
}

/** Every square in the given rows, across the 6 playable columns. */
export function squaresInRows(...rows: number[]): Position[] {
  return rows.flatMap((row) => Array.from({ length: 6 }, (_, column) => position(row, column)));
}
