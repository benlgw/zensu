import type { Connection } from "./OnlineGame.svelte";

type chatMessage = { type: "chat"; text: string };
type commandMessage = { type: "command"; text: string };

export class Chat {
  #messages = $state<{ from: "me" | "opponent"; text: string }[]>([]);

  #connection: Connection;
  #commands = new Map<string, (from: "me" | "opponent") => void>();
  #stopListening: (() => void)[];

  constructor(connection: Connection) {
    this.#connection = connection;
    this.#stopListening = [
      connection.on<chatMessage>("chat", (message) =>
        this.#messages.push({ from: "opponent", text: message.text }),
      ),
    ];
  }

  get messages() {
    return this.#messages;
  }

  send(text: string): void {
    text = text.trim();
    if (text === "") return;

    const message: chatMessage = { type: "chat", text };
    this.#connection.send(message);
    this.#messages.push({ from: "me", text });
  }

  dispose(): void {
    this.#stopListening.forEach((stop) => stop());
  }
}
