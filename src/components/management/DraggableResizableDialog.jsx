import React, { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * DraggableResizableDialog
 *
 * Requirements handled:
 * - Floating window (draggable + resizable)
 * - Only ONE "X" close button
 * - Footer supports Save + Edit Fields in bottom-right
 * - Footer is sticky (always visible)
 * - Remembers size/position (sessionStorage)
 *
 * Usage:
 * <DraggableResizableDialog
 *   open={open}
 *   title="New Status"
 *   storageKey="status_modal"
 *   onClose={onClose}
 *   footerRight={<>
 *     <Button variant="outline" onClick={onEditFields}>Edit Fields</Button>
 *     <Button onClick={onSave}>Save</Button>
 *   </>}
 * >
 *   ...your form...
 * </DraggableResizableDialog>
 */

export default function DraggableResizableDialog({
  open = false,
  title = "Dialog",
  storageKey,
  onClose,
  children,

  defaultWidth = 900,
  defaultHeight = 650,
  minWidth = 600,
  minHeight = 500,

  footerLeft = null,
  footerRight = null,

  showClose = true,
}) {
  const key = useMemo(() => storageKey || `dialog_${title}`, [storageKey, title]);

  const [isMounted, setIsMounted] = useState(false);

  const [position, setPosition] = useState({ x: 80, y: 80 });
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });

  useEffect(() => {
    setIsMounted(true);

    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition({ x: parsed.x, y: parsed.y });
        } else {
          centerWindow();
        }

        if (parsed.width && parsed.height) {
          setSize({ width: parsed.width, height: parsed.height });
        } else {
          setSize({ width: defaultWidth, height: defaultHeight });
        }
        return;
      } catch {
        // fall through to centerWindow
      }
    }

    centerWindow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, defaultWidth, defaultHeight]);

  const centerWindow = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.min(defaultWidth, Math.floor(vw * 0.95));
    const height = Math.min(defaultHeight, Math.floor(vh * 0.95));

    const x = Math.max(10, Math.floor((vw - width) / 2));
    const y = Math.max(10, Math.floor((vh - height) / 2));

    setSize({ width, height });
    setPosition({ x, y });
    sessionStorage.setItem(key, JSON.stringify({ x, y, width, height }));
  };

  const saveState = (pos, sz) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({ x: pos.x, y: pos.y, width: sz.width, height: sz.height })
    );
  };

  if (!open || !isMounted) return null;

  return (
    <Rnd
      position={position}
      size={size}
      minWidth={minWidth}
      minHeight={minHeight}
      bounds="window"
      dragHandleClassName="dialog-title-bar"
      onDragStop={(e, d) => {
        const minY = 60; // Minimum distance from top to keep title bar accessible
        const maxY = window.innerHeight - 100; // Keep some window visible at bottom
        const newPos = { 
          x: Math.max(0, Math.min(d.x, window.innerWidth - size.width)),
          y: Math.max(minY, Math.min(d.y, maxY))
        };
        setPosition(newPos);
        saveState(newPos, size);
      }}
      onResizeStop={(e, dir, ref, delta, newPos) => {
        const newSize = {
          width: parseInt(ref.style.width, 10),
          height: parseInt(ref.style.height, 10),
        };
        setSize(newSize);
        setPosition(newPos);
        saveState(newPos, newSize);
      }}
      className="fixed z-50 bg-white rounded-lg shadow-2xl border border-slate-200 flex flex-col overflow-hidden min-h-0"
    >
      {/* Title Bar */}
      <div className="dialog-title-bar flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200 cursor-move select-none">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>

        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">{children}</div>

      {/* Footer (sticky, always visible) */}
      <div className="border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">{footerLeft}</div>
        <div className="flex items-center gap-2 justify-end">{footerRight}</div>
      </div>

      {/* Resize handle (visual only) */}
      <div className="absolute bottom-0 right-0 w-4 h-4 bg-gradient-to-tl from-indigo-500 to-transparent cursor-se-resize opacity-30" />
    </Rnd>
  );
}