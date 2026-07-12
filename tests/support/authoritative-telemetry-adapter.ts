import {
  EncounterCompatibilityRecorder,
  type EncounterOutcome,
  type EncounterTargetClass,
} from "./encounter-compatibility";

/** Structural mirror of the provisional server-only callback payload. */
export interface AuthoritativeTelemetryLike {
  at: number;
  sourcePlayerId: string;
  actionId: string;
  targetId: string;
  targetClass: EncounterTargetClass;
  outcome: EncounterOutcome;
  magnitude?: number;
  duration?: number;
}

export interface EncounterTelemetryOptions {
  telemetry: (event: AuthoritativeTelemetryLike) => void;
}

/**
 * Adds the pure encounter sink to arbitrary GameWorld options without importing
 * the server or public protocol. Authoritative resolution remains the sole
 * producer of events and the recorder remains a read-only consumer.
 */
export function withEncounterTelemetry<T extends object>(
  options: T,
  recorder: EncounterCompatibilityRecorder,
): T & EncounterTelemetryOptions {
  return {
    ...options,
    telemetry: (event) => recorder.recordEvent({ ...event }),
  };
}
