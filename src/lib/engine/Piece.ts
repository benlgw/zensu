export type pieceRank = 1 | 2;
export type pieceColor = "red" | "blue";

export class Piece {
  #rank: pieceRank;
  #colour: pieceColor;

  constructor(rank: pieceRank, colour: pieceColor) {
    this.#rank = rank;
    this.#colour = colour;
  }

  get rank(): pieceRank {
    return this.#rank;
  }

  get colour(): pieceColor {
    return this.#colour;
  }

  isEnemyOf(other: Piece): boolean {
    return this.colour !== other.colour;
  }
}
