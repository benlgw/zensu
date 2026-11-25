import { describe, expect, test } from "vitest";
import { Game } from "../lib/engine/Game.svelte";
import { Piece } from "../lib/engine/Piece";
import { place, position } from "./helpers";

/** Sets up a game where blue's next move (row 1 → row 0, capturing red's 2) wins. */
function gameOneMoveFromBlueWin(): Game {
  const game = new Game();
  place(game.gameboard, position(1, 0), new Piece(1, "blue")); // replaces the red 1 there
  return game;
}

describe("starting state", () => {
  test("blue moves first and there's no winner", () => {
    const game = new Game();
    expect(game.currentTurn).toBe("blue");
    expect(game.winner).toBeNull();
  });
});

describe("tryMove", () => {
  test("a legal move on your turn is applied and the turn passes to red", () => {
    const game = new Game();
    const piece = game.gameboard.pieceAt(position(7, 0));

    expect(game.tryMove(position(7, 0), position(6, 0))).toBe(true);

    expect(game.gameboard.pieceAt(position(7, 0))).toBeNull();
    expect(game.gameboard.pieceAt(position(6, 0))).toBe(piece);
    expect(game.currentTurn).toBe("red");
  });

  test("turns alternate between blue and red", () => {
    const game = new Game();

    game.tryMove(position(7, 0), position(6, 0)); // blue
    expect(game.currentTurn).toBe("red");

    game.tryMove(position(1, 0), position(2, 0)); // red
    expect(game.currentTurn).toBe("blue");
  });

  test("moving the opponent's piece is refused", () => {
    const game = new Game();
    const red = game.gameboard.pieceAt(position(1, 0));

    // A legal move for red, but it's blue's turn.
    expect(game.tryMove(position(1, 0), position(2, 0))).toBe(false);

    expect(game.gameboard.pieceAt(position(1, 0))).toBe(red);
    expect(game.gameboard.pieceAt(position(2, 0))).toBeNull();
    expect(game.currentTurn).toBe("blue");
  });

  test("a player can't move twice in a row", () => {
    const game = new Game();
    game.tryMove(position(7, 0), position(6, 0));

    expect(game.tryMove(position(7, 1), position(6, 1))).toBe(false);
    expect(game.gameboard.pieceAt(position(6, 1))).toBeNull();
  });

  test("an illegal square is refused and the turn doesn't change", () => {
    const game = new Game();
    const piece = game.gameboard.pieceAt(position(7, 0));

    // Blue 1's only opening move is up 1 to row 6, not up 2.
    expect(game.tryMove(position(7, 0), position(5, 0))).toBe(false);

    expect(game.gameboard.pieceAt(position(7, 0))).toBe(piece);
    expect(game.gameboard.pieceAt(position(5, 0))).toBeNull();
    expect(game.currentTurn).toBe("blue");
  });

  test("moving from an empty square is refused", () => {
    const game = new Game();
    expect(game.tryMove(position(4, 0), position(3, 0))).toBe(false);
    expect(game.currentTurn).toBe("blue");
  });

  test("captures are removed from the board", () => {
    const game = gameOneMoveFromBlueWin();
    const blue = game.gameboard.pieceAt(position(1, 0));

    game.tryMove(position(1, 0), position(0, 0));

    expect(game.gameboard.pieceAt(position(0, 0))).toBe(blue); // the red 2 is gone
    expect(game.gameboard.pieceAt(position(1, 0))).toBeNull();
  });
});

describe("winning", () => {
  test("a winning move sets the winner and the turn doesn't switch", () => {
    const game = gameOneMoveFromBlueWin();

    expect(game.tryMove(position(1, 0), position(0, 0))).toBe(true);

    expect(game.winner).toBe("blue");
    expect(game.currentTurn).toBe("blue");
  });

  test("no moves are accepted after the game is won", () => {
    const game = gameOneMoveFromBlueWin();
    game.tryMove(position(1, 0), position(0, 0));
    const red = game.gameboard.pieceAt(position(1, 1));

    // Legal for red, and red would be next if the game were still going.
    expect(game.tryMove(position(1, 1), position(2, 1))).toBe(false);
    // Legal for blue, which still holds currentTurn.
    expect(game.tryMove(position(7, 0), position(6, 0))).toBe(false);

    expect(game.gameboard.pieceAt(position(1, 1))).toBe(red);
    expect(game.gameboard.pieceAt(position(6, 0))).toBeNull();
  });
});

describe("legalMoves", () => {
  test("shows moves for either player, whatever the turn", () => {
    const game = new Game();

    // It's blue's turn, but red's moves are still available for highlighting.
    expect(game.legalMoves(position(1, 0)).map((m) => m.newPosition)).toEqual([position(2, 0)]);
    expect(game.legalMoves(position(7, 0)).map((m) => m.newPosition)).toEqual([position(6, 0)]);
  });
});
