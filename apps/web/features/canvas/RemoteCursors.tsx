"use client";

import { useSyncStore } from "../../stores/sync-store";

/**
 * Renders remote user cursors on the canvas. Each cursor shows a colored
 * arrow + username label, positioned in world coordinates (same space as
 * elements). The parent container must apply the viewport transform.
 */
export function RemoteCursors({ zoom }: { zoom: number }) {
  const remoteUsers = useSyncStore((s) => s.remoteUsers);

  if (remoteUsers.size === 0) return null;

  return (
    <>
      {Array.from(remoteUsers.entries()).map(([key, user]) => {
        if (user.cursor_x == null || user.cursor_y == null) return null;

        return (
          <div
            key={key}
            className="pointer-events-none absolute"
            style={{
              left: user.cursor_x,
              top: user.cursor_y,
              transform: `scale(${1 / Math.max(zoom, 0.35)})`,
              transformOrigin: "top left",
              transition: "left 80ms linear, top 80ms linear",
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="16"
              height="20"
              viewBox="0 0 16 20"
              fill="none"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}
            >
              <path
                d="M1 1L6 18L8.5 11L15 9L1 1Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {/* Username label */}
            <span
              className="absolute left-3.5 top-3.5 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.username}
            </span>
          </div>
        );
      })}
    </>
  );
}
