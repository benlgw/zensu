<script lang="ts">
    import Gameboard from "./Gameboard.svelte";

    import { Game } from "../../engine/Game.svelte";
    import type { position } from "../../engine/Gameboard.svelte";

    const game = new Game();
    const flipped = false;

    const movableColour = $derived(game.winner ? null : game.currentTurn);
    let selected = $state<position | null>(null);
    const highlights = $derived(
        selected && game.gameboard.pieceAt(selected)?.colour === movableColour
            ? game.legalMoves(selected).map((move) => move.newPosition)
            : [],
    );

    function move(newPosition: position) {
        if (selected) game.tryMove(selected, newPosition);
        selected = null;
    }
</script>

<div class="play">
    <Gameboard
        grid={game.gameboard.grid}
        {highlights}
        onSelect={(position) => (selected = position)}
        onDeselect={() => (selected = null)}
        onMove={move}
        {movableColour}
        {flipped}
    />
</div>

<style>
    .play {
        display: flex;
        justify-content: center;
    }
</style>
