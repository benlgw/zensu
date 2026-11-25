<script lang="ts">
    import Lobby from "./lib/components/lobby/Lobby.svelte";
    import { P2P } from "./lib/multiplayer/P2P.svelte";

    const connection = new P2P();
    connection.host();

    let name = $state("");
</script>

{#if connection.status !== "connected"}
    <Lobby {name} code={connection.code} join={(code: string) => connection.join(code)} />
{:else}
    <!-- render play screen -->
    <p>connected!!!</p>
{/if}
