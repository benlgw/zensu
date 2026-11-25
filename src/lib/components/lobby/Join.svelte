<script lang="ts">
    let {
        name = $bindable(),
        code,
        join,
    }: {
        name: string;
        code: string;
        join: (code: string) => void;
    } = $props();

    let nameCreated = $state(false);
    let joinCode = $state("");
</script>

<div class="join">
    {#if !nameCreated}
        <h1 class="nameTitle">Create a name</h1>
        <div class="name">
            <input type="text" placeholder="Enter a name to conitnue..." bind:value={name} />
            <button disabled={name === ""} onclick={() => (nameCreated = true)}>Continue</button>
        </div>
    {:else}
        <h1 class="host-title">Host a game</h1>
        <section class="create-game">
            <div class="code">
                <h2 class="game-code">{code}</h2>
                <button onclick={() => navigator.clipboard.writeText(code)}>Copy</button>
            </div>
            <hr />
            <h1 class="join-title">Join a game</h1>
            <div class="join-game">
                <input type="text" placeholder="Code" bind:value={joinCode} />
                <button disabled={joinCode === code} onclick={() => join(joinCode)}>Join</button>
            </div>
        </section>
    {/if}
</div>

<style>
    .join {
        min-height: 15rem;
        min-width: 25rem;
        padding: 1rem 5rem;

        box-shadow: 1px 1px 5px black;
    }

    .nameTitle {
        text-align: center;
        margin-bottom: 20%;
    }

    .host-title,
    .join-title {
        text-align: center;
        margin-bottom: 1rem;
    }

    .name,
    .create-game,
    .join-game {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    hr {
        color: black;
    }

    .code {
        display: flex;
        justify-content: space-around;
    }

    .code button {
        padding-inline: 2rem;
    }

    .game-code {
        font-weight: normal;
    }

    input {
        text-align: center;
    }
</style>
