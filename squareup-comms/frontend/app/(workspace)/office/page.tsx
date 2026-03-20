/**
 * Virtual Office — thin composition layer.
 * Assembles canvas, entities, and glass UI panels into the office experience.
 */

"use client";

import { useRef, useCallback, useMemo, useEffect } from "react";
import type { Direction, UserStatus } from "@/lib/stores/office-store";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useOfficeAmbientSound } from "@/lib/hooks/useOfficeAmbientSound";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWebSocket } from "@/hooks/use-websocket";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { useOfficeTime } from "@/lib/hooks/useOfficeTime";
import { useOfficeKeyboard } from "@/lib/hooks/useOfficeKeyboard";
import { useOfficeCamera } from "@/lib/hooks/useOfficeCamera";
import { useAgentRoutines } from "@/lib/hooks/useAgentRoutines";
import { useWeather } from "@/lib/hooks/useWeather";
import { useEasterEggs } from "@/lib/hooks/useEasterEggs";
import { useOfficeTheme } from "@/lib/hooks/useOfficeTheme";
import { useOfficePresence } from "@/lib/hooks/useOfficePresence";
import { useProximityCall } from "@/lib/hooks/useProximityCall";
import { useCallStore } from "@/lib/stores/call-store";
import { CallOverlay } from "@/components/calls/CallOverlay";
import { buildWalkableGrid, getBlockedTiles, findPath } from "@/lib/office/pathfinding";
import { isoCanvasSize } from "@/lib/office/iso-coords";
import OfficeCanvas from "@/components/office/OfficeCanvas";
import OfficeCharacter from "@/components/office/OfficeCharacter";
import OfficeAgent from "@/components/office/OfficeAgent";
import OfficeZoneOverlay from "@/components/office/OfficeZone";
import AmbientLayer from "@/components/office/AmbientLayer";
import ProximityIndicator from "@/components/office/ProximityIndicator";
import OfficeMiniMap from "@/components/office/OfficeMiniMap";
import OfficeToolbar from "@/components/office/OfficeToolbar";
import EntityDetailPanel from "@/components/office/EntityDetailPanel";
import EditModeOverlay from "@/components/office/EditModeOverlay";
import KeyboardShortcutsOverlay from "@/components/office/KeyboardShortcutsOverlay";
import OnboardingOverlay from "@/components/office/OnboardingOverlay";
import OfficeListView from "@/components/office/OfficeListView";
import OfficeAriaAnnouncer from "@/components/office/OfficeAriaAnnouncer";
import GridOfficeView from "@/components/office/GridOfficeView";
import ProximityChatBubbles from "@/components/office/ProximityChatBubble";
import ProximityPrompt from "@/components/office/ProximityPrompt";
import WaveEffect from "@/components/office/WaveEffect";
import OfficeNotifications from "@/components/office/OfficeNotifications";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const LAYOUT_STORAGE_KEY = "sq-office-layout";

/** Load office layout from backend API, falling back to localStorage. */
async function loadOfficeLayout(authToken: string | null): Promise<void> {
  // Try backend first
  if (authToken) {
    try {
      const res = await fetchWithRetry(`${API_BASE}/api/office/layout`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const hasData =
          (data.furniture && data.furniture.length > 0) ||
          (data.zones && data.zones.length > 0);
        if (hasData) {
          const state = useOfficeStore.getState();
          useOfficeStore.setState({
            ...(data.furniture?.length ? { furniture: data.furniture } : {}),
            ...(data.zones?.length ? { zones: data.zones } : {}),
            ...(data.layout
              ? {
                  layout: {
                    ...state.layout,
                    floorStyle: data.layout.floor_style ?? state.layout.floorStyle,
                    gridCols: data.layout.grid_cols ?? state.layout.gridCols,
                    gridRows: data.layout.grid_rows ?? state.layout.gridRows,
                  },
                }
              : {}),
          });
          return;
        }
      }
    } catch {
      // Fall through to localStorage
    }
  }

  // Fallback: localStorage
  if (typeof window === "undefined") return;
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!saved) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = JSON.parse(saved) as Record<string, any>;
    const state = useOfficeStore.getState();
    useOfficeStore.setState({
      ...(data.furniture ? { furniture: data.furniture as typeof state.furniture } : {}),
      ...(data.zones ? { zones: data.zones as typeof state.zones } : {}),
      ...(data.layout
        ? { layout: { ...state.layout, ...(data.layout as Partial<typeof state.layout>) } }
        : {}),
    });
  } catch {
    // silently ignore corrupt data
  }
}

export default function OfficePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const myUserId = useCurrentUserId();
  const { tokens } = useOfficeTheme();

  const authToken = useAuthStore((s) => s.token);
  const { send: wsSend, on: wsOn } = useWebSocket(authToken);

  const users = useOfficeStore((s) => s.users);
  const agents = useOfficeStore((s) => s.agents);
  const zones = useOfficeStore((s) => s.zones);
  const layout = useOfficeStore((s) => s.layout);
  const furniture = useOfficeStore((s) => s.furniture);
  const viewMode = useOfficeStore((s) => s.viewMode);
  const editMode = useOfficeStore((s) => s.editMode);
  const moveUser = useOfficeStore((s) => s.moveUser);
  const updateUserAnimation = useOfficeStore((s) => s.updateUserAnimation);
  const setMyPosition = useOfficeStore((s) => s.setMyPosition);
  const updateUserStatus = useOfficeStore((s) => s.updateUserStatus);

  // Load persisted layout from backend API (fallback: localStorage)
  useEffect(() => {
    loadOfficeLayout(authToken);
  }, [authToken]);

  // Hydrate office users from backend
  useEffect(() => {
    const unsub = useAuthStore.subscribe((state) => {
      if (!state.token || !state.profile) return;

      const tkn = state.token;
      const uid = state.profile.firebase_uid;

      fetchWithRetry(`${API_BASE}/api/users/`, {
        headers: { Authorization: `Bearer ${tkn}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data) => {
          useOfficeStore.getState().hydrateUsers(data, uid);
        })
        .catch((err) => console.error("Failed to fetch office users:", err));

      // Only need to hydrate once
      unsub();
    });

    // Also try immediately if already authenticated
    const { token: existingToken, profile } = useAuthStore.getState();
    if (existingToken && profile) {
      fetchWithRetry(`${API_BASE}/api/users/`, {
        headers: { Authorization: `Bearer ${existingToken}` },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
        .then((data) => {
          useOfficeStore.getState().hydrateUsers(data, profile.firebase_uid);
        })
        .catch((err) => console.error("Failed to fetch office users:", err));
      unsub();
    }

    return () => unsub();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time: update other users' positions when they move
  useEffect(() => {
    return wsOn("office.user_moved", (data) => {
      const userId = data.user_id as string;
      if (userId === myUserId) return;
      moveUser(
        userId,
        data.x as number,
        data.y as number,
        (data.direction as Direction) ?? "down",
      );
    });
  }, [wsOn, moveUser, myUserId]);

  // Real-time: update other users' presence/status
  useEffect(() => {
    return wsOn("office.presence_updated", (data) => {
      const userId = data.user_id as string;
      if (userId === myUserId) return;
      updateUserStatus(
        userId,
        (data.status as UserStatus) ?? "online",
        data.status_message as string | undefined,
      );
    });
  }, [wsOn, updateUserStatus, myUserId]);

  // Idle detection & presence broadcasting (status changes broadcast via WS)
  useOfficePresence({
    userId: myUserId,
    enabled: true,
    onStatusChange: useCallback(
      (status: UserStatus) => wsSend({ type: "office.presence", status }),
      [wsSend],
    ),
  });

  // Zone-based auto-join/leave for meeting rooms
  useProximityCall({ userId: myUserId, enabled: true });

  // Call signaling — incoming call invites via WebSocket
  useEffect(() => {
    const unsubInvite = wsOn("call.invite", (data) => {
      useCallStore.getState().setIncomingCall({
        fromUserId: data.from_user_id as string,
        fromName: data.from_name as string,
        roomName: data.room_name as string,
        timestamp: Date.now(),
      });
    });
    const unsubAccepted = wsOn("call.accepted", (_data) => {
      // The other user accepted — our call is already active, no action needed
    });
    const unsubRejected = wsOn("call.rejected", (_data) => {
      // The other user declined — could show a notification
    });
    return () => {
      unsubInvite();
      unsubAccepted();
      unsubRejected();
    };
  }, [wsOn]);

  // Phase G: Typing indicators — wire chat.typing WS events to avatar dots
  useEffect(() => {
    return wsOn("chat.typing", (data) => {
      const userId = data.user_id as string;
      if (userId === myUserId) return;
      const isTyping = data.is_typing as boolean;
      useOfficeStore.getState().setUserTyping(userId, isTyping);
      // Auto-clear after 5s in case leave event is missed
      if (isTyping) {
        setTimeout(() => {
          useOfficeStore.getState().setUserTyping(userId, false);
        }, 5_000);
      }
    });
  }, [wsOn, myUserId]);

  // Phase G: Emoji reactions — wire office.reaction WS events to floating emojis
  useEffect(() => {
    return wsOn("office.reaction", (data) => {
      const userId = data.user_id as string;
      const emoji = data.emoji as string;
      if (emoji) {
        useOfficeStore.getState().addUserReaction(userId, emoji);
      }
    });
  }, [wsOn]);

  // Phase G: Periodically clean up expired reactions (> 3.5s old)
  useEffect(() => {
    const interval = setInterval(() => {
      useOfficeStore.getState().clearOldUserReactions();
    }, 1_000);
    return () => clearInterval(interval);
  }, []);

  // Phase F: Ambient sound engine
  const ambientZone = zones.find((z) =>
    users.find((u) => u.id === myUserId && u.x >= z.x && u.x < z.x + z.width && u.y >= z.y && u.y < z.y + z.height)
  );
  const currentZoneType = (ambientZone?.type === "focus"
    ? "focus"
    : ambientZone?.type === "meeting"
      ? "meeting"
      : ambientZone
        ? "open"
        : null) as "open" | "meeting" | "focus" | "social" | null;

  const ambientSound = useOfficeAmbientSound({ masterVolume: 0.12, enableHum: true, currentZoneType });

  // Phase F: Trigger join chime when users array grows, leave chime when it shrinks
  const prevUserCountRef = useRef(users.length);
  useEffect(() => {
    const prev = prevUserCountRef.current;
    const curr = users.length;
    if (curr > prev) ambientSound.triggerJoin();
    else if (curr < prev) ambientSound.triggerLeave();
    prevUserCountRef.current = curr;
  }, [users.length, ambientSound]);

  // Phase F: Trigger message pop on new chat messages from others
  useEffect(() => {
    return wsOn("chat.message", () => {
      ambientSound.triggerMessage();
    });
  }, [wsOn, ambientSound]);

  // Phase F: Trigger reaction ping on office reactions
  useEffect(() => {
    return wsOn("office.reaction", () => {
      ambientSound.triggerReaction();
    });
  }, [wsOn, ambientSound]);

  // Phase I: Pathfinding grid memoized on furniture reference (avoid rebuild per click)
  const walkableGrid = useMemo(
    () => buildWalkableGrid(layout.gridCols, layout.gridRows, getBlockedTiles(furniture)),
    [furniture, layout.gridCols, layout.gridRows],
  );

  // Phase I: Throttled WS move sender (max 10 updates/sec)
  const moveSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttledMoveSend = useCallback(
    (x: number, y: number, direction: Direction) => {
      if (moveSendTimerRef.current) return;
      wsSend({ type: "office.move", x, y, direction });
      moveSendTimerRef.current = setTimeout(() => {
        moveSendTimerRef.current = null;
      }, 100);
    },
    [wsSend],
  );

  // Hooks — day/night cycle, weather, agent routines, keyboard controls, camera follow
  useOfficeTime();
  useWeather();
  useAgentRoutines();
  useEasterEggs();
  useOfficeKeyboard(useMemo(() => ({
    enabled: true,
    onMove: (x: number, y: number, direction: Direction) => {
      throttledMoveSend(x, y, direction);
    },
    onToggleMinimap: () => {
      const s = useOfficeStore.getState();
      s.setMinimapExpanded(!s.minimapExpanded);
    },
    onToggleListView: () => {
      const s = useOfficeStore.getState();
      s.setListViewActive(!s.listViewActive);
    },
    onToggleEditMode: () => {
      const s = useOfficeStore.getState();
      s.setEditMode(!s.editMode);
    },
  }), [throttledMoveSend]));

  const camera = useOfficeCamera(
    useMemo(
      () => ({
        containerRef,
        enabled: true,
      }),
      [] // containerRef is stable
    )
  );

  // Click-to-move via A* pathfinding (uses memoized walkable grid — Phase I)
  const handleCanvasClick = useCallback(
    (tileX: number, tileY: number) => {
      if (editMode) return;

      const me = users.find((u) => u.id === myUserId);
      if (!me) return;

      const path = findPath(walkableGrid, me.x, me.y, tileX, tileY);

      if (!path || path.length === 0) return;

      updateUserAnimation(myUserId, "walking");
      let step = 0;

      const walkStep = () => {
        if (step >= path.length) {
          updateUserAnimation(myUserId, "idle");
          return;
        }

        const { x, y } = path[step];
        const prev = step > 0 ? path[step - 1] : { x: me.x, y: me.y };
        const dir =
          x > prev.x
            ? "right"
            : x < prev.x
              ? "left"
              : y > prev.y
                ? "down"
                : "up";

        moveUser(myUserId, x, y, dir);
        setMyPosition(x, y);
        throttledMoveSend(x, y, dir);
        step += 1;
        setTimeout(walkStep, 150);
      };

      walkStep();
    },
    [
      editMode,
      walkableGrid,
      users,
      moveUser,
      updateUserAnimation,
      setMyPosition,
      myUserId,
      throttledMoveSend,
    ]
  );

  const { width: totalW, height: totalH } = isoCanvasSize(layout.gridCols, layout.gridRows);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: tokens.background }}
    >
      {/* View mode: Grid (classic) or Pixel (canvas) */}
      {viewMode === "simplified" ? (
        <GridOfficeView />
      ) : (
        /* Zoomable / pannable pixel stage */
        <div
          className="absolute"
          style={{
            width: totalW,
            height: totalH,
            transform: `translate(${camera.offsetX}px, ${camera.offsetY}px) scale(${camera.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Layer 0-2: Canvas (floor, zones/furniture/grid, day/night) */}
          <OfficeCanvas onClick={handleCanvasClick} />

          {/* Layer 3: Zone HTML overlays */}
          {zones.map((zone) => (
            <OfficeZoneOverlay key={zone.id} zone={zone} />
          ))}

          {/* Layer 3: Proximity indicator */}
          <ProximityIndicator />

          {/* Layer 3: Proximity chat bubbles */}
          <ProximityChatBubbles />

          {/* Layer 3: Characters */}
          {users.map((user) => (
            <OfficeCharacter
              key={user.id}
              user={user}
              isMe={user.id === myUserId}
            />
          ))}

          {/* Layer 3: Agents */}
          {agents.map((agent) => (
              <OfficeAgent key={agent.id} agent={agent} />
            ))}

          {/* Layer 3: Proximity prompt */}
          <ProximityPrompt />

          {/* Layer 3: Wave effect */}
          <WaveEffect />

          {/* Layer 3: Ambient particles & weather */}
          <AmbientLayer />

          {/* Layer 3: Edit mode overlays (furniture handles, zone editor) */}
          {editMode && <EditModeOverlay />}
        </div>
      )}

      {/* Layer 4: Glass UI (fixed position, outside zoom transform) */}
      <CallOverlay />
      <OfficeNotifications />
      <OfficeToolbar />
      <OfficeMiniMap />
      <EntityDetailPanel />
      <KeyboardShortcutsOverlay />
      <OnboardingOverlay />
      <OfficeListView />
      <OfficeAriaAnnouncer />
    </div>
  );
}
