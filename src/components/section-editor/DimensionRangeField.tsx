import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"

interface DimensionRangeFieldProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  unitLabel?: string
  description?: string
  allowUnlimited?: boolean
  showTicks?: boolean
  onChange: (value: number) => void
}

export function DimensionRangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  unitLabel = "m",
  description,
  allowUnlimited = false,
  showTicks = false,
  onChange,
}: DimensionRangeFieldProps) {
  const sliderMax = allowUnlimited ? getSoftMax(value, max, min, step) : max
  const ticks = showTicks ? buildTickValues(min, sliderMax, step) : []

  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {formatDimension(value, unitLabel)}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Slider
          id={id}
          value={[value]}
          min={min}
          max={sliderMax}
          step={step}
          showTooltip
          tooltipContent={(currentValue) => formatDimension(currentValue, unitLabel)}
          onValueChange={(values) => {
            const nextValue = values[0]
            if (nextValue !== undefined) {
              onChange(nextValue)
            }
          }}
          aria-label={label}
        />

        {showTicks ? (
          <span
            className="mt-1 flex w-full items-center justify-between gap-1 px-2.5 text-[11px] font-medium text-muted-foreground"
            aria-hidden="true"
          >
            {ticks.map((tick, index) => (
              <span
                key={`${id}-tick-${tick}`}
                className="flex w-0 flex-col items-center justify-center gap-2"
              >
                <span
                  className={cn(
                    "w-px bg-muted-foreground/70",
                    index === 0 || index === ticks.length - 1 ? "h-2" : "h-1"
                  )}
                />
                <span>{formatTickLabel(tick)}</span>
              </span>
            ))}
          </span>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Input
            id={`${id}-input`}
            type="number"
            min={min}
            max={allowUnlimited ? undefined : max}
            step={step}
            value={value}
            onChange={(event) => {
              const nextValue = Number.parseFloat(event.target.value)
              if (Number.isFinite(nextValue)) {
                onChange(nextValue)
              }
            }}
          />
          <Badge variant="outline">{unitLabel}</Badge>
        </div>
      </div>

      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}

function buildTickValues(min: number, max: number, step: number) {
  const intervals = 4
  const values = Array.from({ length: intervals + 1 }, (_, index) => {
    const rawValue = min + ((max - min) / intervals) * index
    return roundToStep(rawValue, step)
  })

  return Array.from(new Set(values))
}

function roundToStep(value: number, step: number) {
  const precision = step < 1 ? 10 : 1
  return Math.round(Math.round(value / step) * step * precision) / precision
}

function getSoftMax(value: number, max: number, min: number, step: number) {
  const baseline = Math.max(max, min + step * 20)
  return roundToStep(Math.max(baseline, value + step * 20, value * 1.35), step)
}

function formatTickLabel(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(1).replace(/\.0$/, "").replace(".", ",")
}

function formatDimension(value: number, unitLabel: string) {
  const normalized = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, "")

  return `${normalized.replace(".", ",")} ${unitLabel}`
}
