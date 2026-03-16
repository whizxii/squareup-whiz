/**
 * Virtual Office — thin composition layer.
 * Assembles canvas, entities, and glass UI panels into the office experience.
 */

"use client";

import { useRef, useCallback, useMemo, useEffect } from "react";
import { useOfficeStore } from "@/lib/stores/office-store";
import { useCurrentUserId } from "@/lib/hooks/useCurrentUserId";
import { useOfficeTime } from "@/lib/hooks/useOfficeTime";
import { useOfficeKeyboard } from "@/lib/hooks/useOfficeKeyboard";
import { useOfficeCamera } from "@/lib/hooks/useOfficeCamera";
import { useAgentRoutines } from "@/lib/hooks/useAgentRoutines";
import { useWeather } from "@/lib/hooks/useWeather";
import { useEasterEggs } from "@/lib/hooks/useEasterEggs";
import { buildWalkableGrid, getBlockedTiles, findPath } from "@/lib/office/pathfinding";
import { TILE } from "@/lib/office/office-renderer";
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

const LAYOUT_STORAGE_KEY = "sq-office-layout";

export default function OfficePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const myUserId = useCurrentUserId();

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

  // Load persisted layout from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (!saved) return;
      const data = JSON.parse(saved) as {
        furniture?: typeof furniture;
        zones?: typeof zones;
        layout?: typeof layout;
      };
      const state = useOfficeStore.getState();
      useOfficeStore.setState({
        ...(data.furniture ? { furniture: data.furniture } : {}),
        ...(data.zones ? { zones: data.zones } : {}),
        ...(data.layout ? { layout: { ...state.layout, ...data.layout } } : {}),
      });
    } catch {
      // silently ignore corrupt data
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Hooks — day/night cycle, weather, agent routines, keyboard controls, camera follow
  useOfficeTime();
  useWeather();
  useAgentRoutines();
  useEasterEggs();
  useOfficeKeyboard(useMemo(() => ({
    enabled: true,
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
  }), []));

  const camera = useOfficeCamera(
    useMemo(
      () => ({
        containerRef,
        enabled: true,
      }),
      [] // containerRef is stable
    )
  );

  // Click-to-move via A* pathfinding
  const handleCanvasClick = useCallback(
    (tileX: number, tileY: number) => {
      if (editMode) return;

      const me = users.find((u) => u.id === myUserId);
      if (!me) return;

      const blocked = getBlockedTiles(furniture);
      const grid = buildWalkableGrid(layout.gridCols, layout.gridRows, blocked);
      const path = findPath(grid, me.x, me.y, tileX, tileY);

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
        step += 1;
        setTimeout(walkStep, 150);
      };

      walkStep();
    },
    [
      editMode,
      furniture,
      users,
      layout.gridCols,
      layout.gridRows,
      moveUser,
      updateUserAnimation,
      setMyPosition,
      myUserId,
    ]
  );

  const totalW = layout.gridCols * TILE;
  const totalH = layout.gridRows * TILE;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ backgroundColor: "#1a1714" }}
    >
      {/* View mode: Grid (classic) or Pixel (canvas) */}
      {viewMode === "grid" ? (
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
