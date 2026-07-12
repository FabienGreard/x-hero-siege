export interface LobbyPartyPlayer {
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  accentId: string;
}

export interface LobbyPartyRow {
  id: string;
  name: string;
  accent: string;
  marker: "✓" | "○" | "↻";
  status: "READY · CONNECTED" | "NOT READY · CONNECTED" | "RECONNECTING";
  isLocal: boolean;
  isReady: boolean;
  isConnected: boolean;
  ariaLabel: string;
}

const LOBBY_PARTY_ACCENTS = ["#5f9cbb", "#8b78b8", "#4f9a83", "#b19a62"] as const;

export function lobbyPartyAccent(accentId: string): string {
  const ordinal = Number.parseInt(accentId.match(/(\d+)$/)?.[1] ?? "1", 10);
  return LOBBY_PARTY_ACCENTS[(Math.max(1, ordinal) - 1) % LOBBY_PARTY_ACCENTS.length]!;
}

export function deriveLobbyPartyRows(players: LobbyPartyPlayer[], localPlayerId: string | null): LobbyPartyRow[] {
  return players.slice(0, 4).map((player) => {
    const status = !player.connected
      ? "RECONNECTING"
      : player.ready
        ? "READY · CONNECTED"
        : "NOT READY · CONNECTED";
    const marker = !player.connected ? "↻" : player.ready ? "✓" : "○";
    return {
      id: player.id,
      name: player.name,
      accent: lobbyPartyAccent(player.accentId),
      marker,
      status,
      isLocal: player.id === localPlayerId,
      isReady: player.ready,
      isConnected: player.connected,
      ariaLabel: `${player.name}, Citadel Defender, ${status.toLowerCase().replace(" · ", ", ")}`,
    };
  });
}
