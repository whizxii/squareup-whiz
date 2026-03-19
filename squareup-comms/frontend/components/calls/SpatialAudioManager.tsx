/**
 * SpatialAudioManager — renders inside <LiveKitRoom> context.
 * Manages per-participant audio volume based on tile distance.
 *
 * Instead of using RoomAudioRenderer (which plays all audio at full volume),
 * this component attaches remote audio tracks to <audio> elements with
 * volume controlled by spatial distance.
 */

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTracks, useRemoteParticipants } from "@livekit/components-react";
import { Track, type RemoteAudioTrack } from "livekit-client";
import { useOfficeStore } from "@/lib/stores/office-store";
import { computeSpatialVolume } from "@/lib/hooks/useSpatialAudio";

/** How often to recalculate volumes (ms) */
const VOLUME_UPDATE_INTERVAL = 200;

export default function SpatialAudioManager() {
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const remoteParticipants = useRemoteParticipants();

  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true },
  );

  // Attach/detach audio tracks to <audio> elements
  useEffect(() => {
    const currentTrackIds = new Set<string>();

    for (const trackRef of audioTracks) {
      if (!trackRef.publication?.track || trackRef.participant.isLocal) continue;

      const trackId = trackRef.publication.trackSid;
      if (!trackId) continue;
      currentTrackIds.add(trackId);

      if (!audioElementsRef.current.has(trackId)) {
        const el = document.createElement("audio");
        el.autoplay = true;
        el.volume = 1.0;
        (trackRef.publication.track as RemoteAudioTrack).attach(el);
        audioElementsRef.current.set(trackId, el);
      }
    }

    // Detach removed tracks
    for (const [trackId, el] of audioElementsRef.current) {
      if (!currentTrackIds.has(trackId)) {
        el.srcObject = null;
        el.remove();
        audioElementsRef.current.delete(trackId);
      }
    }
  }, [audioTracks]);

  // Clean up all audio elements on unmount
  useEffect(() => {
    return () => {
      for (const el of audioElementsRef.current.values()) {
        el.srcObject = null;
        el.remove();
      }
      audioElementsRef.current.clear();
    };
  }, []);

  // Map participant identity → track IDs for volume lookup
  const getParticipantTrackMap = useCallback((): ReadonlyMap<string, readonly string[]> => {
    const map = new Map<string, string[]>();
    for (const trackRef of audioTracks) {
      if (!trackRef.publication?.trackSid || trackRef.participant.isLocal) continue;
      const identity = trackRef.participant.identity;
      const existing = map.get(identity) ?? [];
      map.set(identity, [...existing, trackRef.publication.trackSid]);
    }
    return map;
  }, [audioTracks]);

  // Update volumes based on spatial distance
  useEffect(() => {
    const timer = setInterval(() => {
      const { myPosition, users } = useOfficeStore.getState();
      const participantTrackMap = getParticipantTrackMap();

      for (const participant of remoteParticipants) {
        const identity = participant.identity;
        // Match participant identity to office user (identity = firebase_uid)
        const officeUser = users.find((u) => u.id === identity);
        if (!officeUser) continue;

        const volume = computeSpatialVolume(
          myPosition.x,
          myPosition.y,
          officeUser.x,
          officeUser.y,
        );

        const trackIds = participantTrackMap.get(identity) ?? [];
        for (const trackId of trackIds) {
          const el = audioElementsRef.current.get(trackId);
          if (el) {
            el.volume = Math.max(0, Math.min(1, volume));
          }
        }
      }
    }, VOLUME_UPDATE_INTERVAL);

    return () => clearInterval(timer);
  }, [remoteParticipants, getParticipantTrackMap]);

  // This component renders nothing visible — just manages audio
  return null;
}
