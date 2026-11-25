<script lang="ts">
    import Join from "./Join.svelte";

    let {
        name = $bindable(),
        code,
        join,
    }: {
        name: string;
        code: string;
        join: (code: string) => void;
    } = $props();
</script>

<div class="lobby">
    <div class="container">
        <h1>ZENSU</h1>
    </div>
    <div class="container">
        <Join {name} {code} {join} />
    </div>
    <div class="container">
        <!-- some other box art goes here -->
    </div>
</div>

<style>
    h1 {
        writing-mode: vertical-rl;
        text-orientation: upright;
    }

    .lobby {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        height: 100dvh;
        padding: 0 1rem 1rem 1rem;
    }

    .container {
        display: flex;
        align-items: center;

        height: 100%;
    }
</style>
