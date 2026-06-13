"use client";
import { useEffect, useRef, useState } from "react";
import { type Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";

interface EditorRulerProps {
  pageWidthPx?: number;
  leftIndentMm?: number;
  rightIndentMm?: number;
  leftMarginMm?: number;
  rightMarginMm?: number;
  onLeftIndentChange?: (mm: number) => void;
  onRightIndentChange?: (mm: number) => void;
  activeEditor?: Editor | null;
  className?: string;
}

const PAGE_WIDTH_MM = 210;
const RULER_HEIGHT = 24;

export function EditorRuler({
  pageWidthPx = 794,
  leftIndentMm = 0,
  rightIndentMm = 0,
  leftMarginMm = 30,
  rightMarginMm = 20,
  onLeftIndentChange,
  onRightIndentChange,
  activeEditor,
  className,
}: EditorRulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(pageWidthPx);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const [hovering, setHovering] = useState<"left" | "right" | null>(null);

  // Draw ruler on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = RULER_HEIGHT * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${RULER_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const pxPerMm = width / PAGE_WIDTH_MM;

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, RULER_HEIGHT);

    // Left margin shade
    const leftMarginPx = leftMarginMm * pxPerMm;
    ctx.fillStyle = "rgba(203, 213, 225, 0.45)";
    ctx.fillRect(0, 0, leftMarginPx, RULER_HEIGHT - 1);

    // Right margin shade
    const rightEdgePx = (PAGE_WIDTH_MM - rightMarginMm) * pxPerMm;
    ctx.fillStyle = "rgba(203, 213, 225, 0.45)";
    ctx.fillRect(rightEdgePx, 0, width - rightEdgePx, RULER_HEIGHT - 1);

    // Left indent shade (teal, between margin and indent marker)
    const leftIndentPx = (leftMarginMm + leftIndentMm) * pxPerMm;
    if (leftIndentMm > 0) {
      ctx.fillStyle = "rgba(13, 148, 136, 0.12)";
      ctx.fillRect(leftMarginPx, 0, leftIndentPx - leftMarginPx, RULER_HEIGHT - 1);
    }

    // Right indent shade
    const rightIndentPx = (PAGE_WIDTH_MM - rightMarginMm - rightIndentMm) * pxPerMm;
    if (rightIndentMm > 0) {
      ctx.fillStyle = "rgba(13, 148, 136, 0.12)";
      ctx.fillRect(rightIndentPx, 0, rightEdgePx - rightIndentPx, RULER_HEIGHT - 1);
    }

    // Border bottom
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_HEIGHT - 1);
    ctx.lineTo(width, RULER_HEIGHT - 1);
    ctx.stroke();

    // Ticks and labels
    ctx.font = "9px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let mm = 0; mm <= PAGE_WIDTH_MM; mm++) {
      const x = mm * pxPerMm;
      let tickHeight = 0;
      if (mm % 10 === 0) {
        tickHeight = 10;
        if (mm > 0 && mm < PAGE_WIDTH_MM) {
          ctx.fillStyle = "#64748b";
          ctx.fillText(String(mm / 10), x, 10);
        }
      } else if (mm % 5 === 0) {
        tickHeight = 6;
      } else {
        tickHeight = 3;
      }
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, RULER_HEIGHT - 1);
      ctx.lineTo(x, RULER_HEIGHT - 1 - tickHeight);
      ctx.stroke();
    }

    // Marker triangles — left indent (at leftIndentPx) and right indent (at rightIndentPx)
    const drawMarker = (x: number, isHovered: boolean) => {
      ctx.fillStyle = isHovered ? "#0f766e" : "#0d9488";
      ctx.beginPath();
      ctx.moveTo(x - 5, RULER_HEIGHT - 2);
      ctx.lineTo(x + 5, RULER_HEIGHT - 2);
      ctx.lineTo(x, RULER_HEIGHT - 9);
      ctx.closePath();
      ctx.fill();
    };

    drawMarker(leftIndentPx,  hovering === "left"  || dragging === "left");
    drawMarker(rightIndentPx, hovering === "right" || dragging === "right");
  }, [width, leftMarginMm, rightMarginMm, leftIndentMm, rightIndentMm, hovering, dragging]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Drag: window mousemove + mouseup
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const xMm = Math.max(0, Math.min(PAGE_WIDTH_MM,
        ((e.clientX - rect.left) / rect.width) * PAGE_WIDTH_MM
      ));
      if (dragging === "left") {
        const indent = Math.max(0, xMm - leftMarginMm);
        onLeftIndentChange?.(Math.round(indent));
        activeEditor?.chain().focus()
          .updateAttributes("paragraph", {
            marginLeft: indent > 0 ? `${indent}mm` : null,
          })
          .run();
      } else {
        const indent = Math.max(0, PAGE_WIDTH_MM - rightMarginMm - xMm);
        onRightIndentChange?.(Math.round(indent));
        activeEditor?.chain().focus()
          .updateAttributes("paragraph", {
            marginRight: indent > 0 ? `${indent}mm` : null,
          })
          .run();
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, leftMarginMm, rightMarginMm, leftIndentMm, rightIndentMm,
      onLeftIndentChange, onRightIndentChange, activeEditor]);

  const getNearMarker = (e: React.MouseEvent<HTMLDivElement>): "left" | "right" | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const xMm = ((e.clientX - rect.left) / rect.width) * PAGE_WIDTH_MM;
    const leftMarkerMm  = leftMarginMm + leftIndentMm;
    const rightMarkerMm = PAGE_WIDTH_MM - rightMarginMm - rightIndentMm;
    if (Math.abs(xMm - leftMarkerMm)  < 5) return "left";
    if (Math.abs(xMm - rightMarkerMm) < 5) return "right";
    return null;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full overflow-hidden bg-slate-50 border-b select-none print:hidden",
        dragging || hovering ? "cursor-col-resize" : "cursor-default",
        className
      )}
      style={{ height: RULER_HEIGHT }}
      onMouseMove={(e) => { if (!dragging) setHovering(getNearMarker(e)); }}
      onMouseLeave={() => { if (!dragging) setHovering(null); }}
      onMouseDown={(e) => {
        const target = getNearMarker(e);
        if (target) setDragging(target);
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
