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
      className="h-full w-3 flex-shrink-0 flex items-center justify-center
                 bg-gray-100 hover:bg-blue-100 active:bg-blue-200
                 cursor-col-resize border-x border-gray-200
                 hover:border-blue-300 transition-colors duration-150 group"
      title="Kéo để thay đổi độ rộng cột"
    >
      {/* Grip dots — 3 vertical dots as drag indicator */}
      <div className="flex flex-col gap-[3px]">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-blue-500 transition-colors"
          />
        ))}
      </div>
    </div>
  )
}
