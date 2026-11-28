<script lang="ts">
    import Lobby from "./lib/components/lobby/Lobby.svelte";
    import Play from "./lib/components/play/Play.svelte";

    import { P2P } from "./lib/multiplayer/P2P.svelte";

    const connection = new P2P();
    connection.host();

    let name = $state("");
</script>

<!-- "disconnected" only happens after a game has started: keep showing the (now stopped) board. -->
{#if connection.status === "connected" || connection.status === "disconnected"}
    <Play {connection} {name} />
{:else}
    <Lobby bind:name code={connection.code} join={(code: string) => connection.join(code)} />
{/if}
