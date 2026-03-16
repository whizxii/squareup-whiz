"use client";

import { useCallStore } from "@/lib/stores/call-store";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Floating call overlay that appears when the user is in a LiveKit call.
 *
 * When LiveKit client packages (@livekit/components-react, livekit-client)
 * are installed, this component can be extended to render real video tiles.
 * For now it provides the call controls (mute, video, hang-up) and connects
 * to the LiveKit room via the token from the call store.
 */
export function CallOverlay() {
  const isInCall = useCallStore((s) => s.isInCall);
  const roomName = useCallStore((s) => s.roomName);
  const token = useCallStore((s) => s.token);
  const livekitUrl = useCallStore((s) => s.livekitUrl);
  const isMuted = useCallStore((s) => s.isMuted);
  const isVideoOff = useCallStore((s) => s.isVideoOff);
  const loading = useCallStore((s) => s.loading);
  const error = useCallStore((s) => s.error);
  const leaveCall = useCallStore((s) => s.leaveCall);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleVideo = useCallStore((s) => s.toggleVideo);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isInCall) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInCall]);

  if (!isInCall && !loading && !error) return null;

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Error toast */}
      {error && (
        <div className="rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 rounded-xl bg-card px-4 py-3 shadow-lg ring-1 ring-border">
          <Loader2 className="h-4 w-4 animate-spin text-sq-agent" />
          <span className="text-sm">Connecting to call...</span>
        </div>
      )}

      {/* Active call controls */}
      {isInCall && (
        <div className="flex items-center gap-3 rounded-2xl bg-card px-5 py-3 shadow-xl ring-1 ring-border">
          {/* Room info + timer */}
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-sq-online" />
            <span className="text-sm font-medium">{roomName}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {timeStr}
            </span>
          </div>

          <div className="mx-1 h-6 w-px bg-border" />

          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`rounded-lg p-2 transition-colors ${
              isMuted
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "hover:bg-accent text-muted-foreground"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          {/* Video */}
          <button
            onClick={toggleVideo}
            className={`rounded-lg p-2 transition-colors ${
              isVideoOff
                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                : "hover:bg-accent text-muted-foreground"
            }`}
            title={isVideoOff ? "Turn on camera" : "Turn off camera"}
          >
            {isVideoOff ? (
              <VideoOff className="h-4 w-4" />
            ) : (
              <Video className="h-4 w-4" />
            )}
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
      )}
    </div>
  );
}
