import Peer from "peerjs";
import type { DataConnection } from "peerjs";

export type Role = "host" | "guest";
export type Status =
  "idle" | "creating" | "waiting" | "joining" | "connected" | "disconnected" | "error";

const ID_PREFIX = "zensu-";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_HOST_ATTEMPTS = 5;

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (bytes) => CODE_CHARS[bytes % CODE_CHARS.length]).join("");
}

function normaliseCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/^ZENSU-/, "");
}

type Message = { type: string };

function isMessage(data: unknown): data is Message {
  return typeof data === "object" && data !== null && typeof (data as Message).type === "string";
}

export class P2P {
  #peer: Peer | null = null;
  #connection: DataConnection | null = null;
  #handlers = new Map<string, Set<(message: any) => void>>();
  #buffer: Message[] = [];

  #status = $state<Status>("idle");
  #role = $state<Role | null>(null);
  #code = $state("");
  #error = $state("");

  constructor() {
    window.addEventListener("beforeunload", () => this.#peer?.destroy());
  }

  get status(): Status {
    return this.#status;
  }

  get role(): Role | null {
    return this.#role;
  }

  get code(): string {
    return this.#code;
  }

  get error(): string {
    return this.#error;
  }

  host(attempt = 1): void {
    this.leave();
    this.#role = "host";
    this.#status = "creating";

    const code = generateCode();
    const peer = new Peer(ID_PREFIX + code);
    this.#peer = peer;

    peer.on("open", () => {
      this.#code = code;
      this.#status = "waiting";
    });

    peer.on("connection", (connection) => {
      if (this.#connection) {
        connection.on("open", () => connection.close());
        return;
      }
      this.#accept(connection);
    });

    peer.on("error", (err) => {
      if (err.type === "unavailable-id" && attempt < MAX_HOST_ATTEMPTS) {
        this.host(attempt + 1); // code already taken: try another
      } else {
        this.#fail(err.message);
      }
    });
  }

  join(input: string): void {
    const code = normaliseCode(input);
    if (!code) {
      this.#error = "Enter a game code";
      return;
    }

    this.leave();
    this.#role = "guest";
    this.#status = "joining";

    const peer = new Peer();
    this.#peer = peer;

    peer.on("open", () => {
      this.#accept(peer.connect(ID_PREFIX + code, { reliable: true, serialization: "json" }));
    });

    peer.on("error", (error) => {
      this.#fail(
        error.type === "peer-unavailable" ? `No game found with code ${code}` : error.message,
      );
    });
  }

  send(data: unknown): void {
    if (this.#status === "connected" && this.#connection?.open) {
      void this.#connection.send(data);
    }
  }

  on<T extends Message = any>(type: string, handler: (message: T) => void): () => void {
    let handlers = this.#handlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.#handlers.set(type, handlers);
    }
    handlers.add(handler);

    const pending = this.#buffer.filter((message) => message.type === type);
    this.#buffer = this.#buffer.filter((message) => message.type !== type);
    pending.forEach((message) => handler(message as T));

    return () => handlers.delete(handler);
  }

  leave(): void {
    this.#peer?.destroy();
    this.#peer = null;
    this.#connection = null;
    this.#buffer = [];
    this.#role = null;
    this.#code = "";
    this.#error = "";
    this.#status = "idle";
  }

  #accept(connection: DataConnection): void {
    this.#connection = connection;

    connection.on("open", () => {
      this.#status = "connected";
    });

    connection.on("data", (data) => this.#receive(data));

    connection.on("close", () => {
      this.#status = "disconnected";
    });
  }

  #receive(data: unknown): void {
    if (!isMessage(data)) {
      console.warn("Ignoring message without a type:", data);
      return;
    }

    const handlers = this.#handlers.get(data.type);
    if (handlers && handlers.size > 0) handlers.forEach((handler) => handler(data));
    else this.#buffer.push(data);
  }

  #fail(message: string): void {
    if (this.#status === "connected") {
      console.warn("PeerJS:", message);
      return;
    }
    this.leave();
    this.#status = "error";
    this.#error = message;
  }
}
