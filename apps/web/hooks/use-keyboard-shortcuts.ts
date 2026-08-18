import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onDuplicate?: () => void;
  onCommandPalette?: () => void;
  onEscape?: () => void;
  onPanToolHold?: (held: boolean) => void;
  onGroup?: () => void;
  onUngroup?: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Callers (Canvas.tsx) pass a fresh `handlers` object literal every
  // render. Keeping it in a ref — updated every render, but not part of the
  // effect's dependency array — means the window listeners are attached
  // exactly once instead of being torn down and re-attached on every
  // render, while still always calling the latest closures.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const handlers = handlersRef.current;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }

      if (e.key === "Escape") {
        if (isTypingTarget(e.target)) {
          // Let Escape defocus the field first; a second Escape (now that
          // focus has left the input) clears the canvas selection.
          (e.target as HTMLElement).blur();
          return;
        }
        handlers.onEscape?.();
        return;
      }

      if (isTypingTarget(e.target)) return;

      if (mod && e.key.toLowerCase() === "z" && e.shiftKey) {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "g" && e.shiftKey) {
        e.preventDefault();
        handlers.onUngroup?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handlers.onGroup?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handlers.onDuplicate?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handlers.onSelectAll?.();
        return;
      }
      // Checking both `e.key` (character/label — affected by layout, Fn
      // combos) and `e.code` (physical key position — more consistent
      // across keyboards, including compact 60% layouts where Delete is
      // often only reachable via Fn+Backspace and some browsers/OSes report
      // that combination inconsistently in `e.key`).
      if (
        e.key === "Delete" ||
        e.key === "Backspace" ||
        e.code === "Delete" ||
        e.code === "Backspace"
      ) {
        e.preventDefault();
        handlers.onDelete?.();
        return;
      }
      if (e.code === "Space") {
        handlers.onPanToolHold?.(true);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") handlersRef.current.onPanToolHold?.(false);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}
