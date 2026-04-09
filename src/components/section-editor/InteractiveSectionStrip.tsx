import * as React from "react"

import { elementDefinitions } from "@/data/sectionLibrary"
import type { SectionElement } from "@/types"
import { cn } from "@/lib/utils"
import {
  formatMeters,
  getInteractiveStripWidth,
  getSegmentWidthPx,
  withAlpha,
} from "./editorHelpers"

interface InteractiveSectionStripProps {
  elements: SectionElement[]
  totalWidth: number
  activeElementId: string | null
  onSelect: (id: string) => void
  onResize: (id: string, width: number) => void
  onReorder: (id: string, targetIndex: number) => void
}

type InteractionState =
  | {
      mode: "move"
      id: string
    }
  | {
      mode: "resize"
      id: string
      startClientX: number
      startWidth: number
    }

export function InteractiveSectionStrip({
  elements,
  totalWidth,
  activeElementId,
  onSelect,
  onResize,
  onReorder,
}: InteractiveSectionStripProps) {
  const trackRef = React.useRef<HTMLDivElement | null>(null)
  const [interaction, setInteraction] = React.useState<InteractionState | null>(null)
  const draggingId = interaction?.mode === "move" ? interaction.id : null
  const resizingId = interaction?.mode === "resize" ? interaction.id : null

  React.useEffect(() => {
    if (!interaction) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (interaction.mode === "resize") {
        const renderedWidth = trackRef.current?.clientWidth ?? getInteractiveStripWidth(totalWidth)
        const pixelsPerMeter = totalWidth > 0 ? renderedWidth / totalWidth : 0

        if (!pixelsPerMeter) {
          return
        }

        const deltaWidth = (event.clientX - interaction.startClientX) / pixelsPerMeter
        onResize(interaction.id, interaction.startWidth + deltaWidth)
        return
      }

      const targetIndex = resolveTargetIndex(
        event.clientX,
        elements,
        totalWidth,
        trackRef.current
      )

      if (targetIndex === null) {
        return
      }

      const currentIndex = elements.findIndex((element) => element.id === interaction.id)

      if (currentIndex !== -1 && targetIndex !== currentIndex) {
        onReorder(interaction.id, targetIndex)
      }
    }

    const handlePointerUp = () => {
      setInteraction(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    window.addEventListener("pointercancel", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  }, [elements, interaction, onReorder, onResize, totalWidth])

  if (elements.length === 0 || totalWidth <= 0) {
    return (
      <div className="select-none rounded-[28px] border border-dashed border-border bg-muted/35 px-4 py-8 text-center text-sm leading-6 text-muted-foreground">
        Nessuna fascia presente. Aggiungi un elemento per iniziare a comporre la
        sezione.
      </div>
    )
  }

  const stripWidth = getInteractiveStripWidth(totalWidth)

  return (
    <div className="select-none overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(247,245,240,0.94))] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        <span>Trascina la fascia per spostarla</span>
        <span>Tira la maniglia destra per ridimensionarla</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          ref={trackRef}
          className="flex min-w-full items-stretch overflow-hidden rounded-[24px] border border-border/70 bg-background/70"
          style={{ width: `${stripWidth}px` }}
        >
          {elements.map((element, index) => {
            const definition = elementDefinitions[element.type]
            const segmentWidth = getSegmentWidthPx(
              element.width,
              totalWidth,
              stripWidth
            )
            const isActive = element.id === activeElementId
            const isDragging = element.id === draggingId
            const isResizing = element.id === resizingId

            return (
              <div
                key={element.id}
                role="button"
                tabIndex={0}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return
                  }

                  event.preventDefault()
                  onSelect(element.id)
                  setInteraction({
                    mode: "move",
                    id: element.id,
                  })
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    onSelect(element.id)
                  }
                }}
                className={cn(
                  "group relative flex shrink-0 cursor-grab flex-col justify-between border-r px-3 pb-4 pt-3 text-left transition-all duration-300 ease-out last:border-r-0 first:rounded-l-[24px] last:rounded-r-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "-translate-y-2 shadow-[0_18px_32px_rgba(16,24,40,0.16)]"
                    : "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(16,24,40,0.1)]",
                  isDragging && "cursor-grabbing ring-2 ring-primary/30",
                  isResizing && "ring-2 ring-primary/40"
                )}
                style={{
                  width: `${segmentWidth}px`,
                  minWidth: `${Math.min(124, Math.max(84, element.width * 18))}px`,
                  color: definition.textColor,
                  borderColor: withAlpha(definition.stroke, 0.32),
                  background: `linear-gradient(180deg, ${withAlpha(
                    definition.fill,
                    0.97
                  )} 0%, ${withAlpha(definition.stroke, 0.84)} 100%)`,
                }}
                aria-pressed={isActive}
                title={`${definition.label} - ${formatMeters(element.width)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-85">
                    {formatMeters(element.width)}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-75">
                    {definition.shortLabel}
                  </div>
                  <div className="text-sm font-semibold leading-tight">
                    {definition.label}
                  </div>
                  {element.type === "treeStrip" &&
                  element.treeHeight !== undefined ? (
                    <div className="text-xs opacity-80">
                      h {formatMeters(element.treeHeight)}
                    </div>
                  ) : null}
                </div>

                {isActive ? (
                  <span className="pointer-events-none absolute inset-x-3 top-2 h-1 rounded-full bg-black/14" />
                ) : null}

                <span
                  role="presentation"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelect(element.id)
                    setInteraction({
                      mode: "resize",
                      id: element.id,
                      startClientX: event.clientX,
                      startWidth: element.width,
                    })
                  }}
                  className={cn(
                    "absolute inset-y-2 right-1 flex w-3 cursor-ew-resize items-center justify-center rounded-full transition-colors",
                    isResizing ? "bg-black/14" : "hover:bg-black/10"
                  )}
                >
                  <span className="h-10 w-[2px] rounded-full bg-current/55" />
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function resolveTargetIndex(
  clientX: number,
  elements: SectionElement[],
  totalWidth: number,
  trackElement: HTMLDivElement | null
) {
  if (!trackElement || totalWidth <= 0) {
    return null
  }

  const rect = trackElement.getBoundingClientRect()
  const relativeX = Math.max(0, Math.min(clientX - rect.left, rect.width))
  const stripWidth = trackElement.clientWidth || getInteractiveStripWidth(totalWidth)
  let accumulatedWidth = 0

  for (let index = 0; index < elements.length; index += 1) {
    const segmentWidth = getSegmentWidthPx(
      elements[index].width,
      totalWidth,
      stripWidth
    )
    const center = accumulatedWidth + segmentWidth / 2

    if (relativeX < center) {
      return index
    }

    accumulatedWidth += segmentWidth
  }

  return elements.length - 1
}
