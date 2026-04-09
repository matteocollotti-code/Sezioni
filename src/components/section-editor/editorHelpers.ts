export function formatMeters(value: number) {
  const formattedValue = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, "")

  return `${formattedValue.replace(".", ",")} m`
}

export function formatDrawingMm(widthInMeters: number, scale: number) {
  const widthInMillimeters = (widthInMeters * 1000) / scale
  const value =
    widthInMillimeters >= 100
      ? Math.round(widthInMillimeters)
      : Number(widthInMillimeters.toFixed(1))

  return `${String(value).replace(".", ",")} mm`
}

export function getInteractiveStripWidth(totalWidth: number) {
  return Math.max(totalWidth * 38, 760)
}

export function getSegmentWidthPx(
  elementWidth: number,
  totalWidth: number,
  stripWidth: number
) {
  if (totalWidth <= 0) {
    return 96
  }

  return Math.max((elementWidth / totalWidth) * stripWidth, 84)
}

export function withAlpha(hex: string, alpha: number) {
  const rgb = parseHexColor(hex)

  if (!rgb) {
    return hex
  }

  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

function parseHexColor(value: string) {
  const normalized = value.trim().replace("#", "")

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}
