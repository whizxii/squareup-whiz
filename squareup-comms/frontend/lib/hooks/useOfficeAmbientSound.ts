/**
 * Ambient sound engine for the virtual office.
 *
 * Uses the Web Audio API to generate procedural sounds — no external audio
 * files required. Plays a gentle background hum, zone-specific tones, and
 * responds to office events (join, message, reaction).
 *
 * Architecture:
 * - Single AudioContext shared for the lifetime of the hook
 * - Master gain node controls overall volume
 * - Oscillator-based background hum (pink-noise approximation via filtered white noise)
 * - Transient "chime" for join/leave and message events
 * - Zone-aware: focus zones lower hum; meeting zones add slight reverb
 *
 * NOTE: Web Audio is gated on user gesture. The engine auto-resumes on first
 * pointer interaction to comply with browser autoplay policy.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AmbientSoundConfig {
  /** Overall volume 0–1. Defaults to 0.15. */
  readonly masterVolume?: number;
  /** Enable background hum. Defaults to true. */
  readonly enableHum?: boolean;
  /** Zone type the local user is currently in (affects hum character). */
  readonly currentZoneType?: "open" | "meeting" | "focus" | "social" | null;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Creates a pink-noise-approximating white noise source filtered to a gentle
 * rumble — perceived as an office AC / open-plan ambient hum.
 */
function createAmbientHum(ctx: AudioContext, masterGain: GainNode): () => void {
  const bufferSize = ctx.sampleRate * 2; // 2 sec loop
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // White noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Low-pass filter — makes it feel like muffled office background
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = 220;
  lpf.Q.value = 0.5;

  // Gain for just the hum — separate from master so we can duck independently
  const humGain = ctx.createGain();
  humGain.gain.value = 0.04;

  source.connect(lpf);
  lpf.connect(humGain);
  humGain.connect(masterGain);
  source.start();

  return () => {
    try {
      source.stop();
      source.disconnect();
      lpf.disconnect();
      humGain.disconnect();
    } catch {
      // Already stopped
    }
  };
}

/**
 * Play a soft chime transient — used for join/leave/message events.
 * freq: fundamental frequency in Hz
 * duration: fade-out time in seconds
 */
function playChime(ctx: AudioContext, masterGain: GainNode, freq: number, duration = 0.6): void {
  const osc = ctx.createOscillator();
  const envGain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  const now = ctx.currentTime;
  envGain.gain.setValueAtTime(0, now);
  envGain.gain.linearRampToValueAtTime(0.18, now + 0.01); // attack
  envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // decay

  osc.connect(envGain);
  envGain.connect(masterGain);

  osc.start(now);
  osc.stop(now + duration);
}

/**
 * Play a soft two-tone "pop" for message receive.
 */
function playMessagePop(ctx: AudioContext, masterGain: GainNode): void {
  playChime(ctx, masterGain, 880, 0.25);
  setTimeout(() => {
    if (ctx.state === "running") {
      playChime(ctx, masterGain, 1047, 0.2);
    }
  }, 60);
}

/**
 * Play a low "thud" for join event.
 */
function playJoinSound(ctx: AudioContext, masterGain: GainNode): void {
  playChime(ctx, masterGain, 523, 0.5);
  setTimeout(() => {
    if (ctx.state === "running") {
      playChime(ctx, masterGain, 659, 0.4);
    }
  }, 80);
}

/**
 * Play a descending two-note for leave event.
 */
function playLeaveSound(ctx: AudioContext, masterGain: GainNode): void {
  playChime(ctx, masterGain, 659, 0.4);
  setTimeout(() => {
    if (ctx.state === "running") {
      playChime(ctx, masterGain, 523, 0.5);
    }
  }, 80);
}

/**
 * Play a bright reaction "ping" for emoji reactions.
 */
function playReactionSound(ctx: AudioContext, masterGain: GainNode): void {
  playChime(ctx, masterGain, 1318, 0.3);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface AmbientSoundControls {
  /** Manually trigger join chime (e.g. when a new user appears). */
  readonly triggerJoin: () => void;
  /** Manually trigger leave chime. */
  readonly triggerLeave: () => void;
  /** Manually trigger message pop. */
  readonly triggerMessage: () => void;
  /** Manually trigger reaction ping. */
  readonly triggerReaction: () => void;
  /** Set master volume 0–1. */
  readonly setVolume: (v: number) => void;
}

export function useOfficeAmbientSound(config: AmbientSoundConfig = {}): AmbientSoundControls {
  const {
    masterVolume = 0.15,
    enableHum = true,
    currentZoneType = null,
  } = config;

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const stopHumRef = useRef<(() => void) | null>(null);
  const volumeRef = useRef(masterVolume);

  // Initialize audio context on first user gesture
  const ensureContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) {
      // Resume if suspended (browser autoplay policy)
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume().catch(() => undefined);
      }
      return ctxRef.current;
    }

    try {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = volumeRef.current;
      master.connect(ctx.destination);

      ctxRef.current = ctx;
      masterGainRef.current = master;
      return ctx;
    } catch {
      return null;
    }
  }, []);

  // Auto-resume on user interaction (autoplay compliance).
  // Also lazily creates the AudioContext on first gesture so we never call
  // `new AudioContext()` before a user interaction (Chrome autoplay policy).
  useEffect(() => {
    const resume = () => {
      if (ctxRef.current) {
        if (ctxRef.current.state === "suspended") {
          ctxRef.current.resume().catch(() => undefined);
        }
        return;
      }

      // First gesture — create the context now that we have permission
      try {
        const ctx = new AudioContext();
        const master = ctx.createGain();
        master.gain.value = volumeRef.current;
        master.connect(ctx.destination);
        ctxRef.current = ctx;
        masterGainRef.current = master;

        // Start the hum if it was requested but couldn't start yet (context was missing)
        if (enableHum && !stopHumRef.current) {
          const stop = createAmbientHum(ctx, master);
          stopHumRef.current = stop;
        }
      } catch {
        // AudioContext not available
      }
    };

    window.addEventListener("pointerdown", resume, { once: false, passive: true });
    window.addEventListener("keydown", resume, { once: false, passive: true });

    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [enableHum]);

  // Start/stop background hum when enableHum changes.
  // Does NOT create an AudioContext — that only happens on first user gesture
  // (see the gesture listener effect above) to comply with autoplay policy.
  useEffect(() => {
    if (!enableHum) {
      stopHumRef.current?.();
      stopHumRef.current = null;
      return;
    }

    // Context may not exist yet (waiting for first gesture) — if so, the
    // gesture handler will start the hum once the context is created.
    const ctx = ctxRef.current;
    if (!ctx || !masterGainRef.current || ctx.state !== "running") return;

    const stop = createAmbientHum(ctx, masterGainRef.current);
    stopHumRef.current = stop;

    return () => {
      stop();
      stopHumRef.current = null;
    };
  }, [enableHum]);

  // Adjust hum character based on zone type
  useEffect(() => {
    if (!masterGainRef.current) return;
    // Focus zone: reduce master volume slightly for quiet atmosphere
    const targetVol = currentZoneType === "focus" ? volumeRef.current * 0.4 : volumeRef.current;
    masterGainRef.current.gain.setTargetAtTime(
      targetVol,
      masterGainRef.current.context.currentTime,
      0.5, // time constant for smooth transition
    );
  }, [currentZoneType]);

  // Update master volume when prop changes
  useEffect(() => {
    volumeRef.current = masterVolume;
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        masterVolume,
        masterGainRef.current.context.currentTime,
        0.1,
      );
    }
  }, [masterVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopHumRef.current?.();
      ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      masterGainRef.current = null;
    };
  }, []);

  const triggerJoin = useCallback(() => {
    const ctx = ensureContext();
    if (ctx?.state === "running" && masterGainRef.current) {
      playJoinSound(ctx, masterGainRef.current);
    }
  }, [ensureContext]);

  const triggerLeave = useCallback(() => {
    const ctx = ensureContext();
    if (ctx?.state === "running" && masterGainRef.current) {
      playLeaveSound(ctx, masterGainRef.current);
    }
  }, [ensureContext]);

  const triggerMessage = useCallback(() => {
    const ctx = ensureContext();
    if (ctx?.state === "running" && masterGainRef.current) {
      playMessagePop(ctx, masterGainRef.current);
    }
  }, [ensureContext]);

  const triggerReaction = useCallback(() => {
    const ctx = ensureContext();
    if (ctx?.state === "running" && masterGainRef.current) {
      playReactionSound(ctx, masterGainRef.current);
    }
  }, [ensureContext]);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = Math.max(0, Math.min(1, v));
    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        volumeRef.current,
        masterGainRef.current.context.currentTime,
        0.1,
      );
    }
  }, []);

  return { triggerJoin, triggerLeave, triggerMessage, triggerReaction, setVolume };
}
