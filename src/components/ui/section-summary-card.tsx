import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"

import { cn } from "@/lib/utils"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export interface SectionSummaryItem {
  category: string
  percentage: number
  amount: number
  color: string
  count: number
  detail?: string
}

export interface SectionSummaryCardProps {
  title: string
  dateRange: string
  data: SectionSummaryItem[]
  unit?: string
  totalLabel?: string
  buttonText?: string
  onButtonClick?: () => void
  className?: string
}

const formatDimension = (amount: number, unit: string) => {
  const normalized = Number.isInteger(amount)
    ? amount.toFixed(0)
    : amount.toFixed(1).replace(/\.0$/, "")

  return `${normalized.replace(".", ",")} ${unit}`
}

export function SectionSummaryCard({
  title,
  dateRange,
  data,
  unit = "m",
  totalLabel = "Larghezza totale",
  buttonText = "Chiudi",
  onButtonClick,
  className,
}: SectionSummaryCardProps) {
  const totalAmount = React.useMemo(
    () => data.reduce((sum, item) => sum + item.amount, 0),
    [data]
  )

  const size = 180
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const chartSegments = React.useMemo(() => {
    return data.reduce<
      Array<
        SectionSummaryItem & {
          segmentLength: number
          offset: number
        }
      >
    >((segments, item) => {
      const accumulatedPercentage = segments.reduce(
        (sum, segment) => sum + segment.percentage,
        0
      )

      return [
        ...segments,
        {
          ...item,
          segmentLength: (item.percentage / 100) * circumference,
          offset: (accumulatedPercentage / 100) * circumference,
        },
      ]
    }, [])
  }, [circumference, data])

  return (
    <Card
      className={cn(
        "w-full overflow-hidden rounded-[28px] border border-border/70 bg-card/95 py-0 shadow-[0_18px_60px_rgba(16,24,40,0.08)]",
        className
      )}
    >
      <CardHeader className="border-b border-border/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-xl font-semibold text-card-foreground">
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{dateRange}</p>
        </div>
        {onButtonClick ? (
          <CardAction>
            <Button variant="ghost" size="sm" onClick={onButtonClick}>
              {buttonText}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="px-5 py-5 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)] xl:items-center">
          <div className="relative flex h-52 items-center justify-center">
            <AnimatePresence>
              <motion.svg
                key={data.map((item) => `${item.category}-${item.amount}`).join("|")}
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: 0.35 } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                className="-rotate-90"
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="hsl(var(--muted))"
                  strokeWidth={strokeWidth}
                />

                {chartSegments.map((item) => (
                  <motion.circle
                    key={item.category}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${item.segmentLength} ${circumference}`}
                    strokeDashoffset={-item.offset}
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{
                      pathLength: 1,
                      opacity: 1,
                      transition: { duration: 0.7, ease: "easeInOut" },
                    }}
                  />
                ))}
              </motion.svg>
            </AnimatePresence>

            <div className="absolute flex max-w-[120px] flex-col items-center justify-center text-center">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {totalLabel}
              </span>
              <span className="mt-1 text-2xl font-bold text-card-foreground">
                {formatDimension(totalAmount, unit)}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((item, index) => (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    delay: index * 0.04,
                    duration: 0.28,
                    ease: "easeOut",
                  },
                }}
                className="flex min-h-28 flex-col justify-between rounded-[24px] bg-muted/45 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.category}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-bold text-card-foreground">
                    {formatDimension(item.amount, unit)}
                  </p>
                  {item.detail ? (
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {item.detail}
                    </p>
                  ) : null}
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {item.count} {item.count === 1 ? "fascia" : "fasce"}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
