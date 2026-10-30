"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface InteractiveGridProps extends React.ComponentProps<"svg"> {
  /** Side of a cell, in pixels. */
  cellSize?: number;
}

/**
 * A grid whose cells light up under the pointer and fade out behind it, like
 * a trail. It fills its positioned parent and follows the pointer over that
 * parent, so the content on top stays clickable. The cells take the text
 * color.
 */
export function InteractiveGrid({
  cellSize = 80,
  className,
  ...props
}: InteractiveGridProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [size, setSize] = React.useState({ columns: 0, rows: 0 });
  const [active, setActive] = React.useState<number | null>(null);

  React.useEffect(() => {
    const svg = svgRef.current;
    const parent = svg?.parentElement;
    if (!svg || !parent) return;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = svg.getBoundingClientRect();
      setSize({
        columns: Math.ceil(width / cellSize),
        rows: Math.ceil(height / cellSize),
      });
    });
    resizeObserver.observe(svg);

    function onPointerMove(event: PointerEvent) {
      if (!svg) return;
      const bounds = svg.getBoundingClientRect();
      const column = Math.floor((event.clientX - bounds.left) / cellSize);
      const row = Math.floor((event.clientY - bounds.top) / cellSize);
      const columns = Math.ceil(bounds.width / cellSize);
      const rows = Math.ceil(bounds.height / cellSize);
      setActive(
        column >= 0 && row >= 0 && column < columns && row < rows
          ? row * columns + column
          : null,
      );
    }
    function onPointerLeave() {
      setActive(null);
    }

    const isGlobalOrPassive = 
      parent.classList.contains("pointer-events-none") || 
      svg.classList.contains("pointer-events-none") ||
      parent === document.body;

    const target = isGlobalOrPassive ? window : parent;

    target.addEventListener("pointermove", onPointerMove as EventListener);
    target.addEventListener("pointerleave", onPointerLeave as EventListener);
    return () => {
      resizeObserver.disconnect();
      target.removeEventListener("pointermove", onPointerMove as EventListener);
      target.removeEventListener("pointerleave", onPointerLeave as EventListener);
    };
  }, [cellSize]);

  return (
    <svg
      ref={svgRef}
      data-slot="interactive-grid"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full text-foreground",
        className,
      )}
      {...props}
    >
      {Array.from({ length: size.columns * size.rows }, (_, index) => (
        <rect
          key={index}
          x={(index % size.columns) * cellSize}
          y={Math.floor(index / size.columns) * cellSize}
          width={cellSize}
          height={cellSize}
          fill="currentColor"
          stroke="currentColor"
          strokeOpacity={0.1}
          // Light up at once, then fade out slowly once the pointer has left.
          className={cn(
            "transition-[fill-opacity] ease-out motion-reduce:transition-none",
            index === active
              ? "duration-0 [fill-opacity:0.15]"
              : "duration-1000 [fill-opacity:0]",
          )}
        />
      ))}
    </svg>
  );
}

export default InteractiveGrid;
