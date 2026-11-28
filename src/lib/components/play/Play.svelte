<script lang="ts">
    import { onDestroy } from "svelte";

    import Gameboard from "./Gameboard.svelte";
    import { OnlineGame } from "../../multiplayer/OnlineGame.svelte";
    import { Players } from "../../multiplayer/OnlineGame.svelte";
    import { Chat } from "../../multiplayer/Chat.svelte";
    import ChatBox from "./Chat.svelte";

    import dropSoundUrl from "../../../assets/sounds/percussive-hit.mp3";

    import type { position } from "../../engine/Gameboard.svelte";
    import type { P2P } from "../../multiplayer/P2P.svelte";

    let {
        connection,
        name,
    }: {
        connection: P2P;
        name: string;
    } = $props();

    // svelte-ignore state_referenced_locally
    const online = new OnlineGame(connection);
    const game = online.game;
    // svelte-ignore state_referenced_locally
    const players = new Players(connection, name);
    // svelte-ignore state_referenced_locally
    const chat = new Chat(connection);
    onDestroy(() => {
        online.dispose();
        players.dispose();
        chat.dispose();
    });

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

    const dropSound = new Audio(dropSoundUrl);
    online.onMove = () => {
        dropSound.play();
    };
</script>

<div class="play">
    <div></div>
    <Gameboard
        grid={game.gameboard.grid}
        {highlights}
        onSelect={(position) => (selected = position)}
        onDeselect={() => (selected = null)}
        onMove={move}
        {movableColour}
        {flipped}
    />
    <ChatBox {chat} {players} {flipped} />
</div>

<style>
    .play {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        height: 100dvh;
    }
</style>
