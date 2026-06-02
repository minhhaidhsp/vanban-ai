"use client"
import { useCallback, useEffect, useRef } from "react"

interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: "left" | "right"
}

export function ResizeHandle({ onResize, direction = "right" }: ResizeHandleProps) {
  const isDragging = useRef(false)
  const startX = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    startX.current = e.clientX
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientX - startX.current
      startX.current = e.clientX
      onResize(direction === "right" ? delta : -delta)
    }
    const onMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [onResize, direction])

  return (
    <div
      onMouseDown={onMouseDown}
      className="relative flex-shrink-0 cursor-col-resize group"
      style={{ width: 8 }}
      title="Kéo để thay đổi độ rộng"
    >
      {/* Hitbox full height, visual indicator thin centered line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors duration-150" />
    </div>
  )
}
