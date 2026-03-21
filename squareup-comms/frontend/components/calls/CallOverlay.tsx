/**
 * CallOverlay — floating UI for active LiveKit calls.
 *
 * When in a call, wraps content in <LiveKitRoom> which manages the Room
 * lifecycle. SpatialAudioManager handles per-participant volume by distance.
 * Video tiles are rendered for participants with cameras enabled.
 */

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useCallStore } from "@/lib/stores/call-store";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import {
  LiveKitRoom,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Loader2,
  Users,
  X,
} from "lucide-react";
import SpatialAudioManager from "./SpatialAudioManager";

// Stable reference — prevents useTracks from re-running on every render
const CAMERA_TRACK_SOURCES = [{ source: Track.Source.Camera, withPlaceholder: false }];

// ---------------------------------------------------------------------------
// Active call UI — rendered inside <LiveKitRoom> context
// ---------------------------------------------------------------------------

function ActiveCallUI() {
  const { tokens } = useOfficeTheme();
  const roomName = useCallStore((s) => s.roomName);
  const isMuted = useCallStore((s) => s.isMuted);
  const isVideoOff = useCallStore((s) => s.isVideoOff);
  const leaveCall = useCallStore((s) => s.leaveCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleVideo = useCallStore((s) => s.toggleVideo);
  const toggleScreenShare = useCallStore((s) => s.toggleScreenShare);

  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const connectionState = useConnectionState();

  // Sync store mute/video state with actual LiveKit tracks — only when connected.
  // Catch NotAllowedError (browser mic/camera permission denied) so it doesn't
  // propagate as an unhandled rejection and trigger the disconnect chain.
  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    localParticipant.setMicrophoneEnabled(!isMuted).catch((err: unknown) => {
      if ((err as { name?: string })?.name === "NotAllowedError") {
        // Permission denied — force muted state in store so UI stays consistent
        if (!isMuted) useCallStore.getState().toggleMute();
      }
    });
  }, [isMuted, localParticipant, connectionState]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected) return;
    localParticipant.setCameraEnabled(!isVideoOff).catch((err: unknown) => {
      if ((err as { name?: string })?.name === "NotAllowedError") {
        if (!isVideoOff) useCallStore.getState().toggleVideo();
      }
    });
  }, [isVideoOff, localParticipant, connectionState]);

  // Sync LiveKit remote participants into call store so other components can read them.
  // Use a stable string key to avoid firing on every render (useRemoteParticipants returns
  // a new array reference each render even when the participant set hasn't changed).
  const participantKey = remoteParticipants.map((p) => p.identity).join(",");
  useEffect(() => {
    useCallStore.getState().setParticipants(
      remoteParticipants.map((p) => ({
        id: p.identity,
        name: p.name ?? p.identity,
        isMuted: !p.isMicrophoneEnabled,
        isVideoOff: !p.isCameraEnabled,
        isSpeaking: p.isSpeaking,
      })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantKey]);

  // Clear participants when this component unmounts (call ended)
  useEffect(() => {
    return () => { useCallStore.getState().setParticipants([]); };
  }, []);

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => {
      if (timerRef.current !== undefined) clearInterval(timerRef.current);
    };
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  // Remote video tracks — sources array is stable (defined outside to avoid new ref each render)
  const allTracks = useTracks(CAMERA_TRACK_SOURCES, { onlySubscribed: true });
  const videoTracks = allTracks.filter(
    (t): t is typeof t & { readonly publication: NonNullable<typeof t.publication> } =>
      !t.participant.isLocal && t.publication != null && t.publication.track != null,
  );

  // Display-friendly room name
  const displayName = roomName?.startsWith("zone-")
    ? roomName.replace("zone-", "").replace(/-/g, " ")
    : roomName?.startsWith("call-")
      ? "Direct Call"
      : roomName ?? "Call";

  const participantCount = remoteParticipants.length + 1;

  return (
    <div className="flex flex-col items-end gap-3">
      {/* Video tiles (if any remote camera is on) */}
      {videoTracks.length > 0 && (
        <div
          className="grid gap-2 rounded-2xl p-2"
          style={{
            backgroundColor: `${tokens.glass}`,
            border: `1px solid ${tokens.glassBorder}`,
            backdropFilter: "blur(12px)",
            gridTemplateColumns:
              videoTracks.length === 1
                ? "1fr"
                : `repeat(${Math.min(videoTracks.length, 2)}, 1fr)`,
          }}
        >
          {videoTracks.map((trackRef) => (
            <div
              key={trackRef.publication.trackSid}
              className="relative overflow-hidden rounded-xl"
              style={{ width: 200, height: 150 }}
            >
              <VideoTrack
                trackRef={trackRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <span
                className="absolute bottom-1 left-2 text-xs font-medium text-white"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
              >
                {trackRef.participant.identity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Call controls bar */}
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl"
        style={{
          backgroundColor: tokens.glass,
          border: `1px solid ${tokens.glassBorder}`,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Room info + timer */}
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" style={{ color: tokens.accent }} />
          <span className="text-sm font-medium capitalize" style={{ color: tokens.text }}>
            {displayName}
          </span>
          <span
            className="text-xs tabular-nums"
            style={{ color: tokens.textSecondary }}
          >
            {timeStr}
          </span>
          <div className="flex items-center gap-1" style={{ color: tokens.textSecondary }}>
            <Users className="h-3 w-3" />
            <span className="text-xs">{participantCount}</span>
          </div>
        </div>

        <div className="mx-1 h-6 w-px" style={{ backgroundColor: tokens.glassBorder }} />

        {/* Mute */}
        <button
          onClick={toggleMute}
          className="rounded-lg p-2 transition-colors"
          style={{
            backgroundColor: isMuted ? "rgba(239,68,68,0.1)" : "transparent",
            color: isMuted ? "#ef4444" : tokens.textSecondary,
          }}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        {/* Video */}
        <button
          onClick={toggleVideo}
          className="rounded-lg p-2 transition-colors"
          style={{
            backgroundColor: isVideoOff ? "rgba(239,68,68,0.1)" : "transparent",
            color: isVideoOff ? "#ef4444" : tokens.textSecondary,
          }}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </button>

        {/* Screen share */}
        <button
          onClick={toggleScreenShare}
          className="rounded-lg p-2 transition-colors"
          style={{ color: tokens.textSecondary }}
          title="Share screen"
        >
          <Monitor className="h-4 w-4" />
        </button>

        {/* Hang up */}
        <button
          onClick={leaveCall}
          className="rounded-lg bg-red-500 p-2 text-white transition-colors hover:bg-red-600"
          title="Leave call"
        >
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incoming call notification
// ---------------------------------------------------------------------------

function IncomingCallBanner() {
  const { tokens } = useOfficeTheme();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const acceptIncomingCall = useCallStore((s) => s.acceptIncomingCall);
  const rejectIncomingCall = useCallStore((s) => s.rejectIncomingCall);

  if (!incomingCall) return null;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-5 py-3 shadow-xl animate-pulse"
      style={{
        backgroundColor: tokens.glass,
        border: `1px solid ${tokens.accent}`,
        backdropFilter: "blur(12px)",
      }}
    >
      <PhoneIncoming className="h-5 w-5" style={{ color: tokens.accent }} />
      <div className="flex flex-col">
        <span className="text-sm font-medium" style={{ color: tokens.text }}>
          {incomingCall.fromName}
        </span>
        <span className="text-xs" style={{ color: tokens.textSecondary }}>
          Incoming call...
        </span>
      </div>
      <button
        onClick={acceptIncomingCall}
        className="rounded-lg bg-green-500 p-2 text-white transition-colors hover:bg-green-600"
        title="Accept"
      >
        <Phone className="h-4 w-4" />
      </button>
      <button
        onClick={rejectIncomingCall}
        className="rounded-lg p-2 transition-colors"
        style={{ color: "#ef4444", backgroundColor: "rgba(239,68,68,0.1)" }}
        title="Decline"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main overlay
// ---------------------------------------------------------------------------

export function CallOverlay() {
  const { tokens } = useOfficeTheme();
  const isInCall = useCallStore((s) => s.isInCall);
  const token = useCallStore((s) => s.token);
  const livekitUrl = useCallStore((s) => s.livekitUrl);
  const loading = useCallStore((s) => s.loading);
  const error = useCallStore((s) => s.error);
  const clearError = useCallStore((s) => s.clearError);
  const incomingCall = useCallStore((s) => s.incomingCall);

  // shouldConnect is a local gate that is set to false SYNCHRONOUSLY on any
  // disconnect/error — before React's async re-render can process the store
  // update. This prevents LiveKit's 5 s reconnect timer from firing a second
  // connection attempt while <LiveKitRoom> is still mounted.
  const [shouldConnect, setShouldConnect] = useState(false);

  // Delay timer ref — used to give LiveKit's internal region-retry up to 5 s
  // to succeed before we tear everything down. Cancelled by handleConnected.
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Enable connect only once we have a fresh token+url from the store.
  useEffect(() => {
    if (isInCall && token && livekitUrl) {
      setShouldConnect(true);
    } else {
      setShouldConnect(false);
    }
  }, [isInCall, token, livekitUrl]);

  // Zero-retry reconnect policy.
  // nextRetryDelayInMs returning null disables the application-level reconnect
  // loop (circuit breaker + 5 s disconnect-delay handle recovery instead).
  // Do NOT set iceTransportPolicy: "relay" here — forcing relay-only prevents
  // host/STUN candidates from being tried, which causes guaranteed ICE failure
  // if LiveKit's TURN is unreachable on the client's network.
  const livekitOptions = useMemo(
    () => ({
      reconnectPolicy: { nextRetryDelayInMs: () => null as null },
    }),
    [],
  );

  const handleDisconnected = useCallback(() => {
    // Don't tear down immediately. LiveKit may fire onDisconnected during its
    // own internal region-retry (ICE failure → try alternate region). Give it
    // up to 5 s to succeed — handleConnected will cancel this timer if the
    // retry connects. Only act if no reconnection happens within the window.
    if (disconnectTimerRef.current !== undefined) return; // timer already pending
    disconnectTimerRef.current = setTimeout(() => {
      disconnectTimerRef.current = undefined;
      setShouldConnect(false);
      if (useCallStore.getState().isInCall) {
        useCallStore.getState().recordCallFailure();
      }
      useCallStore.getState().leaveCall();
    }, 5000);
  }, []);

  const handleError = useCallback((err?: Error) => {
    // Cancel any pending disconnect timer — error is definitive, no retry needed.
    if (disconnectTimerRef.current !== undefined) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = undefined;
    }
    setShouldConnect(false);
    // Permission errors (mic/camera denied) are user-side — don't penalise the
    // circuit breaker, which is intended for server-side auth/network failures.
    if (err?.name !== "NotAllowedError") {
      useCallStore.getState().recordCallFailure();
    }
    useCallStore.getState().leaveCall();
  }, []);

  const handleConnected = useCallback(() => {
    // Region retry succeeded — cancel the pending disconnect teardown.
    if (disconnectTimerRef.current !== undefined) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = undefined;
    }
    useCallStore.getState().recordCallSuccess();
  }, []);

  // Clean up disconnect timer if CallOverlay ever unmounts.
  useEffect(() => {
    return () => {
      if (disconnectTimerRef.current !== undefined) {
        clearTimeout(disconnectTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Error toast */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm shadow-lg backdrop-blur"
          style={{
            backgroundColor: "rgba(239,68,68,0.9)",
            color: "#fff",
          }}
        >
          <span>{error}</span>
          <button onClick={clearError} className="hover:opacity-80">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          className="flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg"
          style={{
            backgroundColor: tokens.glass,
            border: `1px solid ${tokens.glassBorder}`,
            backdropFilter: "blur(12px)",
          }}
        >
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: tokens.accent }} />
          <span className="text-sm" style={{ color: tokens.text }}>
            Connecting to call...
          </span>
        </div>
      )}

      {/* Incoming call notification */}
      {!isInCall && <IncomingCallBanner />}

      {/* Active call with LiveKit Room.
          Mounted on shouldConnect (not isInCall) so that setting shouldConnect=false
          in handleDisconnected UNMOUNTS the component entirely. LiveKit's own cleanup
          effect `() => { room.disconnect(); }` then fires, killing all internal
          reconnect timers before React can schedule another render. Passing
          connect={true} unconditionally is safe because we only mount when
          shouldConnect is already true. */}
      {shouldConnect && token && livekitUrl && (
        <LiveKitRoom
          serverUrl={livekitUrl}
          token={token}
          connect={true}
          audio={false}
          video={false}
          onDisconnected={handleDisconnected}
          onError={handleError}
          onConnected={handleConnected}
          options={livekitOptions}
        >
          {/* Spatial audio (renders nothing visible) */}
          <SpatialAudioManager />
          {/* Active call UI (controls + video tiles) */}
          <ActiveCallUI />
        </LiveKitRoom>
      )}
    </div>
  );
}
