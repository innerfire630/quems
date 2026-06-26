// =============================================================================
// src/lib/sse-manager.ts — SSE connection manager singleton (3.1.1)
// =============================================================================
// Single source of truth for active SSE connections. Holds all connected
// clients in a Map<string, Set<SSEClient>> keyed by channel.
//
// Hot-reload safety: the manager persists across Next.js dev hot-reloads via
// globalThis.__sseManager. Without this, every code change in development
// would tear down all active SSE connections.
//
// Heartbeat: lazily started on first client registration, stopped when the
// last client disconnects. Sends a ": heartbeat\n\n" comment every 30 seconds
// to keep proxy/load-balancer connections alive.
//
// This is process-local — suitable for single-server deployment. Multi-server
// SSE with Redis Pub/Sub is a future concern (Master Plan §17).
// =============================================================================

import type { SSEClient, SSEEnvelope } from '@/lib/sse-client';
import { formatSSEMessage, formatSSEComment } from '@/lib/sse-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChannelMap = Map<string, Set<SSEClient>>;

// ---------------------------------------------------------------------------
// SseManager
// ---------------------------------------------------------------------------

export class SseManager {
  private channels: ChannelMap = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly heartbeatIntervalMs: number;

  constructor(heartbeatIntervalMs = 30_000) {
    this.heartbeatIntervalMs = heartbeatIntervalMs;
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Registers a new client on a channel. Starts the heartbeat if not running. */
  registerClient(channel: string, client: SSEClient): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set());
    }
    this.channels.get(channel)!.add(client);
    this.ensureHeartbeat();

    console.debug(
      `[sse-manager] client registered: channel=${channel}, clientId=${client.id}, totalOnChannel=${this.channels.get(channel)!.size}`,
    );
  }

  /** Removes a client from its channel. Stops the heartbeat if no clients remain. */
  removeClient(client: SSEClient): void {
    const set = this.channels.get(client.channel);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.channels.delete(client.channel);
      }
    }

    if (this.channels.size === 0) {
      this.stopHeartbeat();
    }

    console.debug(
      `[sse-manager] client removed: channel=${client.channel}, clientId=${client.id}, remainingOnChannel=${set?.size ?? 0}`,
    );
  }

  // -----------------------------------------------------------------------
  // Publishing
  // -----------------------------------------------------------------------

  /**
   * Writes an envelope to a single client. No-op if the controller is closed
   * (expected during shutdown — the try/catch silently ignores the error).
   */
  sendToClient(client: SSEClient, envelope: SSEEnvelope): void {
    try {
      const bytes = formatSSEMessage(envelope);
      client.controller.enqueue(bytes);
    } catch {
      // Controller closed — client disconnected between the lookup and the write.
      // This is expected and harmless.
      console.debug(
        `[sse-manager] write skipped (controller closed): channel=${client.channel}, clientId=${client.id}`,
      );
    }
  }

  /**
   * Broadcasts an envelope to all clients on a channel.
   * No-op if the channel has no clients.
   * Copies to an array to avoid mutation-during-iteration issues.
   */
  sendToChannel(channel: string, envelope: SSEEnvelope): void {
    const set = this.channels.get(channel);
    if (!set || set.size === 0) return;

    const clients = Array.from(set);
    for (const client of clients) {
      this.sendToClient(client, envelope);
    }

    console.debug(
      `[sse-manager] broadcast: channel=${channel}, type=${envelope.type}, id=${envelope.id}, clients=${clients.length}`,
    );
  }

  // -----------------------------------------------------------------------
  // Diagnostics
  // -----------------------------------------------------------------------

  /** Returns the number of connected clients on a specific channel. */
  getChannelClientCount(channel: string): number {
    return this.channels.get(channel)?.size ?? 0;
  }

  /** Returns all active channel names. */
  getAllChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /** Returns aggregate stats for diagnostics. */
  getStats(): { totalClients: number; channels: Record<string, number> } {
    const channels: Record<string, number> = {};
    let totalClients = 0;
    for (const [name, set] of this.channels) {
      channels[name] = set.size;
      totalClients += set.size;
    }
    return { totalClients, channels };
  }

  // -----------------------------------------------------------------------
  // Heartbeat (private)
  // -----------------------------------------------------------------------

  private ensureHeartbeat(): void {
    if (this.heartbeatInterval !== null) return;
    this.heartbeatInterval = setInterval(() => this.tickHeartbeat(), this.heartbeatIntervalMs);
  }

  private tickHeartbeat(): void {
    if (this.channels.size === 0) return;

    const comment = formatSSEComment('heartbeat');
    for (const [, set] of this.channels) {
      for (const client of set) {
        try {
          client.controller.enqueue(comment);
        } catch {
          // Client disconnected — remove it
          this.removeClient(client);
        }
      }
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton with hot-reload persistence
// ---------------------------------------------------------------------------

declare global {
  var __sseManager: SseManager | undefined;
}

/** Singleton SSE manager. Survives Next.js dev hot-reload via globalThis. */
export const sseManager: SseManager =
  globalThis.__sseManager ?? (globalThis.__sseManager = new SseManager());
