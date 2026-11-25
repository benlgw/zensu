import { describe, expect, test } from "vitest";
import { Gameboard } from "../lib/engine/Gameboard.svelte";
import type { position as Position } from "../lib/engine/Gameboard.svelte";
import { Piece } from "../lib/engine/Piece";
import { Rules } from "../lib/engine/Rules";
import { makeMove, place, position, squaresInRows } from "./helpers";

const rules = new Rules();

/** Just the destination squares, for readable assertions. */
function destinations(gameboard: Gameboard, from: Position): Position[] {
  return rules.legalMoves(gameboard, from).map((move) => move.newPosition);
}

describe("legalMoves", () => {
  test("an empty square has no moves", () => {
    const gameboard = new Gameboard();
    expect(rules.legalMoves(gameboard, position(4, 0))).toEqual([]);
  });

  test("on the opening board, a blue 2 can only move up 2, jumping its own 1", () => {
    const gameboard = new Gameboard();
    const moves = rules.legalMoves(gameboard, position(8, 0));

    expect(moves.map((m) => m.newPosition)).toEqual([position(6, 0)]);
    expect(moves[0].captured).toEqual([]); // jumping your own piece captures nothing
  });

  test("on the opening board, a blue 1 can only move up 1", () => {
    const gameboard = new Gameboard();
    // right 2 lands on its own piece; down 3 and left 4 are off the board
    expect(destinations(gameboard, position(7, 0))).toEqual([position(6, 0)]);
  });

  test("red's directions are flipped: its 'up' moves toward blue", () => {
    const gameboard = new Gameboard();
    expect(destinations(gameboard, position(1, 5))).toEqual([position(2, 5)]); // red 1: up 1
    expect(destinations(gameboard, position(0, 0))).toEqual([position(2, 0)]); // red 2: up 2
  });

  test("every piece has exactly one opening move", () => {
    const gameboard = new Gameboard();
    for (const square of squaresInRows(0, 1, 7, 8)) {
      expect(rules.legalMoves(gameboard, square)).toHaveLength(1);
    }
  });

  test("a piece can't land on its own piece", () => {
    const gameboard = new Gameboard();
    // blue 1 at row 7, column 0: right 2 would land on the blue 1 at column 2
    expect(destinations(gameboard, position(7, 0))).not.toContainEqual(position(7, 2));
  });

  test("moves that would leave the board are excluded", () => {
    const gameboard = new Gameboard();
    place(gameboard, position(4, 5), new Piece(1, "blue"));
    // blue 1 in the last column: right 2 would be column 7
    expect(destinations(gameboard, position(4, 5))).not.toContainEqual(position(4, 7));
  });

  test("captures every enemy jumped over, plus one on the landing square", () => {
    const gameboard = new Gameboard();
    place(gameboard, position(4, 4), new Piece(1, "blue"));
    place(gameboard, position(4, 2), new Piece(1, "red"));
    place(gameboard, position(4, 0), new Piece(2, "red"));

    // blue 1 moves left 4: passes columns 3, 2, 1 and lands on 0
    const left = rules
      .legalMoves(gameboard, position(4, 4))
      .find((m) => m.newPosition.column === 0)!;

    expect(left.captured.map((c) => c.position)).toEqual([position(4, 2), position(4, 0)]);
  });

  test("jumped-over pieces of your own colour are not captured", () => {
    const gameboard = new Gameboard();
    place(gameboard, position(4, 4), new Piece(1, "blue"));
    place(gameboard, position(4, 2), new Piece(1, "blue"));
    place(gameboard, position(4, 1), new Piece(1, "red"));

    const left = rules
      .legalMoves(gameboard, position(4, 4))
      .find((m) => m.newPosition.column === 0)!;

    expect(left.captured.map((c) => c.position)).toEqual([position(4, 1)]);
  });
});

describe("winner", () => {
  test("an ordinary opening move doesn't win", () => {
    const gameboard = new Gameboard();
    const [move] = rules.legalMoves(gameboard, position(8, 0));
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBeNull();
  });

  test("blue wins by reaching row 0", () => {
    const gameboard = new Gameboard();
    const move = makeMove(gameboard, position(7, 0), position(0, 0), [position(0, 0)]);
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBe("blue");
  });

  test("red wins by reaching row 8", () => {
    const gameboard = new Gameboard();
    const move = makeMove(gameboard, position(1, 0), position(8, 0), [position(8, 0)]);
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBe("red");
  });

  test("reaching your own back row doesn't win", () => {
    const gameboard = new Gameboard();
    place(gameboard, position(0, 0), null);
    const move = makeMove(gameboard, position(1, 0), position(0, 0)); // red onto red's own back row
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBeNull();
  });

  test("capturing the opponent's last piece wins", () => {
    const gameboard = new Gameboard();
    // Leave red with a single piece on row 1, column 0.
    for (const square of squaresInRows(0, 1)) {
      if (!(square.row === 1 && square.column === 0)) place(gameboard, square, null);
    }
    place(gameboard, position(2, 0), new Piece(1, "blue"));

    // blue 1 moves up 1 onto the last red piece (row 1, so not a territory win)
    const move = makeMove(gameboard, position(2, 0), position(1, 0), [position(1, 0)]);
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBe("blue");
  });

  test("a capture that leaves the opponent with pieces doesn't win", () => {
    const gameboard = new Gameboard();
    place(gameboard, position(2, 0), new Piece(1, "blue"));

    const move = makeMove(gameboard, position(2, 0), position(1, 0), [position(1, 0)]);
    gameboard.move(move);

    expect(rules.winner(gameboard, move)).toBeNull();
  });
});
