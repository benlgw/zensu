import { expect, test } from "vitest";
import { Gameboard } from "../lib/engine/Gameboard";
import type { position } from "../lib/engine/Gameboard";
import { Rules } from "../lib/engine/Rules";
import type { move } from "../lib/engine/Rules";

const position = (row: number, column: number): position => ({ row, column });

/** Builds a move by hand. Gameboard.move applies whatever it's given; legality is Rules' job. */
function makeMove(
  gameboard: Gameboard,
  from: position,
  to: position,
  captured: position[] = [],
): move {
  return {
    oldPosition: from,
    newPosition: to,
    piece: gameboard.pieceAt(from)!,
    captured: captured.map((position) => ({ piece: gameboard.pieceAt(position)!, position })),
  };
}

/** Every square in the given rows, across the 6 playable columns. */
function squaresInRows(...rows: number[]): position[] {
  return rows.flatMap((row) => Array.from({ length: 6 }, (_, column) => position(row, column)));
}

test("moves the piece from its old position to its new position", () => {
  const gameboard = new Gameboard();
  const piece = gameboard.pieceAt(position(7, 0));
  expect(gameboard.pieceAt(position(6, 0))).toBeNull();

  gameboard.move(makeMove(gameboard, position(7, 0), position(6, 0)));

  expect(gameboard.pieceAt(position(7, 0))).toBeNull();
  expect(gameboard.pieceAt(position(6, 0))).toBe(piece); // the same Piece object, not a copy
});

test("removes every captured piece", () => {
  const gameboard = new Gameboard();

  // Not a legal move: it only checks that the board clears exactly the squares in `captured`.
  gameboard.move(
    makeMove(gameboard, position(8, 0), position(2, 0), [position(1, 1), position(0, 1)]),
  );

  expect(gameboard.pieceAt(position(1, 1))).toBeNull();
  expect(gameboard.pieceAt(position(0, 1))).toBeNull();
  // Squares not listed are untouched.
  expect(gameboard.pieceAt(position(1, 0))?.colour).toBe("red");
  expect(gameboard.pieceAt(position(0, 2))?.colour).toBe("red");
});

test("landing on an enemy replaces it with the moving piece", () => {
  const gameboard = new Gameboard();
  const blue = gameboard.pieceAt(position(7, 0));

  // The landing square is also in `captured`, so this checks the piece is placed
  // after the captures are cleared, not wiped out by them.
  gameboard.move(makeMove(gameboard, position(7, 0), position(1, 0), [position(1, 0)]));

  expect(gameboard.pieceAt(position(7, 0))).toBeNull();
  expect(gameboard.pieceAt(position(1, 0))).toBe(blue);
});

test("jumping over your own piece leaves it on the board", () => {
  const gameboard = new Gameboard();
  const jumpedOver = gameboard.pieceAt(position(7, 0));

  // Blue 2 moves up 2 over the blue 1 in front of it. Nothing is captured.
  gameboard.move(makeMove(gameboard, position(8, 0), position(6, 0)));

  expect(gameboard.pieceAt(position(7, 0))).toBe(jumpedOver);
  expect(gameboard.pieceAt(position(6, 0))?.rank).toBe(2);
  expect(gameboard.pieceAt(position(8, 0))).toBeNull();
});

test("applies a move produced by Rules.legalMoves", () => {
  const gameboard = new Gameboard();
  const rules = new Rules();

  const [move] = rules.legalMoves(gameboard, position(8, 0)); // blue 2's only opening move: up 2
  expect(move.newPosition).toEqual(position(6, 0));

  gameboard.move(move);

  expect(gameboard.pieceAt(position(8, 0))).toBeNull();
  expect(gameboard.pieceAt(position(6, 0))).toBe(move.piece);
});

test("playerHasPieces is true for both colours on the starting board", () => {
  const gameboard = new Gameboard();
  expect(gameboard.playerHasPieces("red")).toBe(true);
  expect(gameboard.playerHasPieces("blue")).toBe(true);
});

test("playerHasPieces is false once every piece of a colour is captured", () => {
  const gameboard = new Gameboard();

  // Not a legal move: one blue move that captures all of red's pieces (rows 0 and 1).
  gameboard.move(makeMove(gameboard, position(7, 0), position(6, 0), squaresInRows(0, 1)));

  expect(gameboard.playerHasPieces("red")).toBe(false);
  expect(gameboard.playerHasPieces("blue")).toBe(true);
});

test("playerHasPieces is still true with a single piece left", () => {
  const gameboard = new Gameboard();

  // Capture every red piece except the one on row 1, column 5.
  const allButOne = squaresInRows(0, 1).filter((p) => !(p.row === 1 && p.column === 5));
  gameboard.move(makeMove(gameboard, position(7, 0), position(6, 0), allButOne));

  expect(gameboard.playerHasPieces("red")).toBe(true);
});
