<script lang="ts">
    import blueOne from "../../../assets/images/zensu-blue-1.svg";
    import blueTwo from "../../../assets/images/zensu-blue-2.svg";
    import redOne from "../../../assets/images/zensu-red-1.svg";
    import redTwo from "../../../assets/images/zensu-red-2.svg";

    import type { Piece } from "../../engine/Piece";

    let {
        piece,
        draggable,
        onDragStart,
        onDragEnd,
        flipped = false,
    }: {
        piece: Piece;
        draggable: boolean;
        onDragStart: () => void;
        onDragEnd: () => void;
        flipped?: boolean;
    } = $props();

    const pieceImgUrl = {
        blue: {
            one: blueOne,
            two: blueTwo,
        },
        red: {
            one: redOne,
            two: redTwo,
        },
    };

    function pieceImg(piece: Piece): string {
        return piece.rank === 1 ? pieceImgUrl[piece.colour].one : pieceImgUrl[piece.colour].two;
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="piece"
    class:draggable
    draggable={draggable ? "true" : "false"}
    ondragstart={(event) => {
        // why firefox :(
        event.dataTransfer?.setData("text/plain", "");
        onDragStart();
    }}
    ondragend={onDragEnd}
>
    <img
        src={pieceImg(piece)}
        alt=""
        class:flipped={(!flipped && piece.colour === "red") || (flipped && piece.colour === "blue")}
    />
</div>

<style>
    .piece {
        height: 95%;
        width: 95%;
    }

    .draggable {
        cursor: pointer;
    }

    img {
        display: block;
        height: 100%;
        width: 100%;

        pointer-events: none;
    }

    .flipped {
        rotate: 180deg;
    }
</style>
