<script lang="ts">
    import type { Piece } from "../../engine/Piece";

    let {
        piece,
        draggable,
        onDragStart,
        onDragEnd,
    }: {
        piece: Piece;
        draggable: boolean;
        onDragStart: () => void;
        onDragEnd: () => void;
    } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="piece {piece.colour}"
    class:draggable
    draggable={draggable ? "true" : "false"}
    ondragstart={(event) => {
        // why firefox :(
        event.dataTransfer?.setData("text/plain", "");
        onDragStart();
    }}
    ondragend={onDragEnd}
>
    {piece.rank}
    <!-- img element of piece -->
</div>

<style>
    .piece {
        font-size: 4rem;
    }

    .draggable {
        cursor: pointer;
    }

    .red {
        color: red;
    }

    .blue {
        color: aqua;
    }
</style>
