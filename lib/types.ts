// Shared types across client + API.

// Mood a user can express on joining.
export type Mood = "happy" | "sad" | "fire" | "tired" | "curious" | null;

export const MOODS: { mood: NonNullable<Mood>; emoji: string; label: string }[] = [
  { mood: "happy", emoji: "😊", label: "Happy" },
  { mood: "sad", emoji: "😢", label: "Sad" },
  { mood: "fire", emoji: "🔥", label: "Fire" },
  { mood: "tired", emoji: "💤", label: "Tired" },
  { mood: "curious", emoji: "🤔", label: "Curious" },
];

export const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  sad: "😢",
  fire: "🔥",
  tired: "💤",
  curious: "🤔",
};

// Signal mailbox message types.
export type SignalType =
  | "request" // connection request (tap a dot)
  | "accept" // recipient accepted
  | "decline" // recipient declined (or auto-declined while busy)
  | "offer" // WebRTC SDP offer
  | "answer" // WebRTC SDP answer
  | "ice" // WebRTC ICE candidate
  | "end"; // hang up / leave the connection

export interface PeerDot {
  id: string;
  lat: number;
  lng: number;
  busy: boolean;
  mood: Mood;
}

export interface SignalMsg {
  id: string;
  fromId: string;
  toId: string;
  type: SignalType;
  payload: string | null;
  createdAt: string;
}

export interface PollResponse {
  peers: PeerDot[];
  signals: SignalMsg[];
}
