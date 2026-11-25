import { Gameboard } from "./Gameboard";
import type { position } from "./Gameboard";
import { Piece } from "./Piece";
import type { pieceColor, pieceRank } from "./Piece";

type direction = "up" | "right" | "down" | "left";
type capture = { piece: Piece; position: position };
export type move = {
  oldPosition: position;
  newPosition: position;
  piece: Piece;
  captured: capture[];
};

const DIRECTIONS: direction[] = ["up", "right", "down", "left"];

const MOVEMENT: Record<pieceRank, Record<direction, number>> = {
  1: { up: 1, right: 2, down: 3, left: 4 },
  2: { up: 2, right: 3, down: 4, left: 1 },
};

const VECTORS: Record<direction, position> = {
  up: { row: -1, column: 0 },
  right: { row: 0, column: 1 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
};

export class Rules {
  // Reverse the vector for red
  #orient(colour: pieceColor, vector: position): position {
    return colour === "blue" ? vector : { row: -vector.row, column: -vector.column };
  }

  legalMoves(gameboard: Gameboard, position: position): move[] {
    const piece = gameboard.pieceAt(position);
    if (!piece) return [];

    const moves: move[] = [];
    for (const direction of DIRECTIONS) {
      const distance = MOVEMENT[piece.rank][direction];
      const unitVector = this.#orient(piece.colour, VECTORS[direction]);
      const newPosition = {
        row: position.row + unitVector.row * distance,
        column: position.column + unitVector.column * distance,
      };

      if (!gameboard.positionExists(newPosition)) continue;
      if (gameboard.pieceAt(newPosition)?.colour === piece.colour) continue;

      const captured: capture[] = [];
      for (let i = 1; i <= distance; i++) {
        const capturePosition = {
          row: position.row + unitVector.row * i,
          column: position.column + unitVector.column * i,
        };
        const other = gameboard.pieceAt(capturePosition);
        if (other && other.isEnemyOf(piece)) {
          captured.push({ piece: other, position: capturePosition });
        }
      }

      moves.push({
        oldPosition: position,
        newPosition: newPosition,
        piece: piece,
        captured: captured,
      });
    }

    return moves;
  }
}
