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
}

export function InteractiveSectionStrip({
  elements,
  totalWidth,
  activeElementId,
  onSelect,
}: InteractiveSectionStripProps) {
  if (elements.length === 0 || totalWidth <= 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-muted/35 px-4 py-8 text-center text-sm leading-6 text-muted-foreground">
        Nessuna fascia presente. Aggiungi un elemento per iniziare a comporre la
        sezione.
      </div>
    )
  }

  const stripWidth = getInteractiveStripWidth(totalWidth)

  return (
    <div className="overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(247,245,240,0.94))] p-3">
      <div className="overflow-x-auto pb-2">
        <div
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

            return (
              <button
                key={element.id}
                type="button"
                onClick={() => onSelect(element.id)}
                className={cn(
                  "group relative flex shrink-0 flex-col justify-between border-r px-3 pb-4 pt-3 text-left transition-all duration-300 ease-out last:border-r-0 first:rounded-l-[24px] last:rounded-r-[24px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? "-translate-y-2 shadow-[0_18px_32px_rgba(16,24,40,0.16)]"
                    : "hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(16,24,40,0.1)]"
                )}
                style={{
                  width: `${segmentWidth}px`,
                  minWidth: `${Math.min(
                    124,
                    Math.max(84, element.width * 18)
                  )}px`,
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
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
