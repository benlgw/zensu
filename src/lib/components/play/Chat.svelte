<script lang="ts">
    import type { Chat } from "../../multiplayer/Chat.svelte";
    import type { Players } from "../../multiplayer/OnlineGame.svelte";

    let {
        chat,
        players,
        flipped = false,
    }: {
        chat: Chat;
        players: Players;
        flipped: Boolean;
    } = $props();

    let text = $state("");
    let messagesBox: HTMLDivElement;

    $effect(() => {
        chat.messages.length;
        messagesBox.scrollTop = messagesBox.scrollHeight;
    });

    function send() {
        chat.send(text);
        text = "";
    }
</script>

<div class="chat">
    <div class="messages" bind:this={messagesBox}>
        {#each chat.messages as message}
            <p
                class:mine={message.from === "me"}
                class:blue={(!flipped && message.from === "me") ||
                    (flipped && message.from === "opponent")}
            >
                <strong>{message.from === "me" ? "You" : players.opponentName}: </strong>
                {message.text}
            </p>
        {/each}
    </div>
    <form
        class="message"
        onsubmit={(event) => {
            event.preventDefault();
            send();
        }}
    >
        <input type="text" name="message" id="message" bind:value={text} />
    </form>
</div>

<style>
    .chat {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-end;
        margin: 1rem 2rem 1rem 5rem;
        padding: 1rem;
        height: 95dvh;

        border: 1px solid black;
        background-color: #cfb888;
    }

    .messages {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        height: 100%;
        width: 100%;
        padding: 1rem;

        overflow: auto;

        background-color: white;
        border: 1px solid black;
    }

    .mine {
        align-self: flex-end;
    }

    .messages > :first-child {
        margin-top: auto;
    }

    p {
        padding: 0.1rem 1rem;

        border-radius: 1rem;
        color: white;
        background-color: #c62224;
    }

    .blue {
        background-color: #008a9b;
    }

    .message {
        display: flex;
        gap: 0.5rem;
        width: 100%;
        margin-top: 1rem;
    }

    input {
        flex: 1;
        margin-right: auto;
    }
</style>
