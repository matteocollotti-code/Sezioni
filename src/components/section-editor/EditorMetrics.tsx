export function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/78 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

export function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-border/70 bg-background/72 px-3 py-1.5 text-xs">
      <span className="font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="ml-2 font-semibold text-foreground">{value}</span>
    </div>
  )
}
