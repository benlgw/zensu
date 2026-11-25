<script lang="ts">
    import { P2P } from "./lib/multiplayer/P2P.svelte";

    const connection = new P2P();
</script>

{#if connection.status !== "connected"}
    <!-- render lobby -->
{:else}
    <!-- render play screen -->
{/if}
