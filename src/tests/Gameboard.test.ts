import { expect, test } from "vitest";
import { Gameboard } from "../lib/engine/Gameboard";
import { Piece } from "../lib/engine/Piece";

test("gameboard rejects out of bound moves", () => {
  const gameboard = new Gameboard();
  expect(() => gameboard.move({ row: -1, column: 0 }, { row: 0, column: 0 })).toThrow(
    "Row must be between 0 and 8, inclusive",
  );
  expect(() => gameboard.move({ row: 0, column: -1 }, { row: 0, column: 0 })).toThrow(
    "Column must be between 0 and 8, inclusive",
  );
  expect(() => gameboard.move({ row: 0, column: 0 }, { row: -1, column: 0 })).toThrow(
    "Row must be between 0 and 8, inclusive",
  );
  expect(() => gameboard.move({ row: 0, column: 0 }, { row: 0, column: -1 })).toThrow(
    "Column must be between 0 and 8, inclusive",
  );
});

test("gameboard moves pieces to correct position", () => {
  const gameboard = new Gameboard();
  expect(gameboard.board[2][0]).toBeNull();
  expect(gameboard.board[1][0]).toBeInstanceOf(Piece);
  gameboard.move({ row: 1, column: 0 }, { row: 2, column: 0 });
  expect(gameboard.board[1][0]).toBeNull();
  expect(gameboard.board[2][0]).toBeInstanceOf(Piece);
});
