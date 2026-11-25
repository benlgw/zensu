<script lang="ts">
    import type { grid as Grid, position as Position } from "../../engine/Gameboard.svelte";
    import type { pieceColor } from "../../engine/Piece";
    import Piece from "./Piece.svelte";

    let {
        grid,
        highlights,
        onSelect,
        onDeselect,
        onMove,
        movableColour,
        flipped = false,
    }: {
        grid: Grid;
        highlights: Position[];
        onSelect: (position: Position) => void;
        onDeselect: () => void;
        onMove: (to: Position) => void;
        movableColour: pieceColor | null;
        flipped?: boolean;
    } = $props();

    // lets the order be flipped for red
    const rowOrder = $derived(order(grid.length, flipped));
    const columnOrder = $derived(order(grid[0].length, flipped));

    // flips indices of grid for red
    function order(length: number, reversed: boolean): number[] {
        const indices = Array.from({ length }, (_, i) => i);
        return reversed ? indices.reverse() : indices;
    }

    function isHighlighted(row: number, column: number): boolean {
        return highlights.some((p) => p.row === row && p.column === column);
    }

    function getRandomColor() {
        var letters = "0123456789ABCDEF";
        var color = "#";
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }
</script>

<div class="board">
    {#each rowOrder as r}
        {#each columnOrder as c}
            {@const cell = grid[r][c]}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
                class="cell"
                class:highlight={isHighlighted(r, c)}
                ondragover={(e) => e.preventDefault()}
                ondrop={(e) => {
                    e.preventDefault();
                    onMove({ row: r, column: c });
                }}
            >
                {#if cell}
                    <Piece
                        piece={cell}
                        draggable={cell.colour === movableColour}
                        onDragStart={() => onSelect({ row: r, column: c })}
                        onDragEnd={onDeselect}
                    />
                {/if}
            </div>
        {/each}
    {/each}
</div>

<style>
    .board {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        grid-template-rows: repeat(9, 1fr);
        /*height: 100dvh;*/
        /*width: 50%;*/

        background-color: blue;
    }

    .cell {
        padding: 0 2rem;
        border: 1px solid black;
    }

    .highlight {
        background-color: rgb(255 255 255 / 0.35);
    }
</style>
