<script lang="ts">
    import { onDestroy } from "svelte";

    import Gameboard from "./Gameboard.svelte";
    import { OnlineGame } from "../../multiplayer/OnlineGame";

    import type { position } from "../../engine/Gameboard.svelte";
    import type { P2P } from "../../multiplayer/P2P.svelte";

    let {
        connection,
    }: {
        connection: P2P;
    } = $props();

    // svelte-ignore state_referenced_locally
    const online = new OnlineGame(connection);
    const game = online.game;
    onDestroy(() => online.dispose());

    const flipped = online.localColour === "red";

    const movableColour = $derived(online.movableColour);
    let selected = $state<position | null>(null);
    const highlights = $derived(
        selected && game.gameboard.pieceAt(selected)?.colour === movableColour
            ? game.legalMoves(selected).map((move) => move.newPosition)
            : [],
    );

    function move(newPosition: position) {
        if (selected) online.play(selected, newPosition);
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
