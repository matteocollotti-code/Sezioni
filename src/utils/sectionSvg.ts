import {
  calculateMetrics,
  elementDefinitions,
  paletteOrder,
} from '../data/sectionLibrary'
import type { ExportModel, ExportVariant, SectionElement } from '../types'

interface SegmentLayout {
  element: SectionElement
  x: number
  width: number
}

const svgSerif = "'Fraunces', Georgia, serif"
const svgSans = "'Manrope', 'Segoe UI', sans-serif"

export function generateRoadSectionSvg(
  { projectTitle, scale, elements }: ExportModel,
  variant: ExportVariant = 'illustrated',
) {
  const safeScale = Math.max(25, scale)
  const metrics = calculateMetrics(elements)
  const totalWidthMm = toScaleMillimeters(metrics.totalWidth, safeScale)
  const canvasWidth = round(Math.max(totalWidthMm + 48, 260))
  const canvasHeight = 150
  const drawingX = round((canvasWidth - totalWidthMm) / 2)
  const sectionY = 56
  const sectionHeight = 44
  const sectionBottom = sectionY + sectionHeight
  const topDimensionY = sectionY - 11
  const totalDimensionY = sectionBottom + 18
  const scaleBarY = totalDimensionY + 12
  const isClean = variant === 'clean'
  const subtitle = isClean
    ? `SVG clean in scala 1:${safeScale}`
    : `SVG vettoriale illustrato in scala 1:${safeScale}`

  let currentX = drawingX
  const layouts = elements.map<SegmentLayout>((element) => {
    const width = toScaleMillimeters(element.width, safeScale)
    const layout = {
      element,
      x: currentX,
      width,
    }

    currentX = round(currentX + width)
    return layout
  })

  const segmentDimensions = layouts
    .filter((segment) => segment.width >= 12)
    .map((segment) =>
      renderDimensionLine(
        segment.x,
        segment.x + segment.width,
        sectionY,
        topDimensionY,
        formatMeters(segment.element.width),
      ),
    )
    .join('')

  const usedTypes = paletteOrder.filter((type) =>
    layouts.some((segment) => segment.element.type === type),
  )
  const elementLayersMarkup = usedTypes
    .map((type) => {
      const definition = elementDefinitions[type]
      const layerMarkup = layouts
        .filter((segment) => segment.element.type === type)
        .map((segment) => renderSegment(segment, sectionY, sectionHeight, variant))
        .join('')

      return renderLayer(
        `element-${slugify(type)}`,
        `Elemento - ${definition.label}`,
        layerMarkup,
      )
    })
    .join('')

  const legendSummary =
    `${metrics.totalWidth.toFixed(1)} m complessivi - ${metrics.greenWidth.toFixed(1)} m di verde`
      .replaceAll('.', ',')

  const scaleBarMeters =
    metrics.totalWidth >= 18 ? 5 : metrics.totalWidth >= 10 ? 2 : 1
  const scaleBarWidth = toScaleMillimeters(scaleBarMeters, safeScale)
  const scaleBarX = round(canvasWidth - drawingX - scaleBarWidth)

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${canvasWidth}mm" height="${canvasHeight}mm" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="section-title section-desc">
  <title id="section-title">${escapeXml(projectTitle)}</title>
  <desc id="section-desc">Sezione stradale quotata, esportata in scala 1:${safeScale}. ${escapeXml(legendSummary)}.</desc>
  <defs>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="4.8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M10 0 L0 5 L10 10" fill="none" stroke="#5f696f" stroke-width="1.1" />
    </marker>
    <marker id="arrow-end" viewBox="0 0 10 10" refX="5.2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="#5f696f" stroke-width="1.1" />
    </marker>
  </defs>
  ${renderLayer(
    'background',
    'Sfondo',
    `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" rx="16" fill="#fcfaf6" />
  <rect x="6" y="6" width="${canvasWidth - 12}" height="${canvasHeight - 12}" rx="12" fill="none" stroke="#dcd6c9" stroke-width="0.6" />
  <path d="M12 34 H${canvasWidth - 12}" stroke="#e5dfd5" stroke-width="0.6" />`,
  )}
  ${renderLayer(
    'header',
    'Testata',
    `<text x="${drawingX}" y="18" font-family="${svgSerif}" font-size="10" font-weight="700" fill="#1f302e">${escapeXml(projectTitle)}</text>
  <text x="${drawingX}" y="27" font-family="${svgSans}" font-size="4.1" letter-spacing="0.28" fill="#63706d">${escapeXml(subtitle)}</text>
  <text x="${canvasWidth - drawingX}" y="18" text-anchor="end" font-family="${svgSans}" font-size="4.6" font-weight="700" fill="#20312f">${escapeXml(formatMeters(metrics.totalWidth))}</text>
  <text x="${canvasWidth - drawingX}" y="27" text-anchor="end" font-family="${svgSans}" font-size="4.1" fill="#63706d">${metrics.greenWidth.toFixed(1).replace('.', ',')} m di verde - ${elements.length} fasce</text>`,
  )}
  ${renderLayer('dimensions-elements', 'Quote elementi', segmentDimensions)}
  ${elementLayersMarkup}
  ${renderLayer(
    'dimensions-total',
    'Quote totali',
    renderDimensionLine(
      drawingX,
      drawingX + totalWidthMm,
      sectionBottom,
      totalDimensionY,
      formatMeters(metrics.totalWidth),
    ),
  )}
  ${renderLayer(
    'scale-bar',
    'Barra di scala',
    `<g>
    <line x1="${scaleBarX}" y1="${scaleBarY}" x2="${scaleBarX + scaleBarWidth}" y2="${scaleBarY}" stroke="#20312f" stroke-width="1.2" />
    <line x1="${scaleBarX}" y1="${scaleBarY - 2.2}" x2="${scaleBarX}" y2="${scaleBarY + 2.2}" stroke="#20312f" stroke-width="1.2" />
    <line x1="${scaleBarX + scaleBarWidth}" y1="${scaleBarY - 2.2}" x2="${scaleBarX + scaleBarWidth}" y2="${scaleBarY + 2.2}" stroke="#20312f" stroke-width="1.2" />
    <text x="${scaleBarX + scaleBarWidth / 2}" y="${scaleBarY + 6}" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="#63706d">${scaleBarMeters} m reali</text>
  </g>`,
  )}
</svg>`
}

export function buildDownloadName(
  projectTitle: string,
  variant: ExportVariant = 'illustrated',
) {
  const baseName =
    projectTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sezione-stradale'

  return variant === 'clean' ? `${baseName}-clean` : `${baseName}-illustrata`
}

function renderSegment(
  segment: SegmentLayout,
  y: number,
  height: number,
  variant: ExportVariant,
) {
  const definition = elementDefinitions[segment.element.type]
  const x = round(segment.x)
  const width = round(segment.width)
  const centerX = round(x + width / 2)
  const centerY = round(y + height / 2)
  const isClean = variant === 'clean'
  const labelMarkup = isClean ? '' : renderLabel(segment, centerX, centerY)
  const symbolMarkup = isClean ? '' : renderSymbol(segment, y, height)

  return `<g>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="3.8" fill="${definition.fill}" stroke="${definition.stroke}" stroke-width="0.7" />
    ${symbolMarkup}
    ${labelMarkup}
  </g>`
}

function renderLabel(segment: SegmentLayout, centerX: number, centerY: number) {
  const definition = elementDefinitions[segment.element.type]
  const label = escapeXml(definition.label)
  const widthLabel = escapeXml(formatMeters(segment.element.width))
  const isNarrow = segment.width < 20

  if (isNarrow) {
    return `<g transform="translate(${centerX} ${centerY}) rotate(-90)">
      <text text-anchor="middle" font-family="${svgSans}" font-size="3.7" font-weight="700" fill="${definition.textColor}">
        ${escapeXml(definition.shortLabel.toUpperCase())} - ${widthLabel}
      </text>
    </g>`
  }

  return `<text x="${centerX}" y="${centerY - 1.5}" text-anchor="middle" font-family="${svgSans}" font-size="4.1" font-weight="800" fill="${definition.textColor}">
    <tspan x="${centerX}" dy="0">${label}</tspan>
    <tspan x="${centerX}" dy="5">${widthLabel}</tspan>
  </text>`
}

function renderSymbol(segment: SegmentLayout, y: number, height: number) {
  const x = round(segment.x)
  const width = round(segment.width)
  const baseY = y + height - 7
  const centerY = y + height / 2

  switch (segment.element.type) {
    case 'lane':
      return `<line x1="${x + 4}" y1="${centerY}" x2="${x + width - 4}" y2="${centerY}" stroke="rgba(255,255,255,0.58)" stroke-width="1.5" stroke-dasharray="5 4" />`
    case 'cycleway':
      return renderRepeated(width, 18, (offsetX) => renderBikeIcon(x + offsetX, centerY))
    case 'sidewalk':
      return renderRepeated(
        width,
        6.5,
        (offsetX) =>
          `<line x1="${x + offsetX}" y1="${y + 5}" x2="${x + offsetX}" y2="${y + height - 5}" stroke="rgba(89,75,57,0.22)" stroke-width="0.6" />`,
      )
    case 'treeStrip':
      return renderRepeated(width, 18, (offsetX, index) => {
        const treeX = x + offsetX
        const treeY = baseY - (index % 2) * 3
        return `<g>
          <circle cx="${treeX}" cy="${treeY - 6}" r="5" fill="rgba(72,112,67,0.28)" stroke="#4a7750" stroke-width="0.7" />
          <rect x="${treeX - 0.6}" y="${treeY - 1}" width="1.2" height="6" fill="#6d533a" />
        </g>`
      })
    case 'plantedBed':
      return renderRepeated(width, 9, (offsetX) => renderLeafCluster(x + offsetX, baseY - 1))
    case 'lawn':
      return renderRepeated(
        width,
        8,
        (offsetX) =>
          `<path d="M${x + offsetX} ${baseY} l1.8 -5 l1.7 5 l1.5 -4.2" fill="none" stroke="#668455" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />`,
      )
    case 'bioswale':
      return `<path d="M${x + 4} ${centerY + 6} C${x + width * 0.25} ${centerY - 1}, ${x + width * 0.5} ${centerY + 12}, ${x + width * 0.75} ${centerY + 3} S${x + width - 4} ${centerY + 7}, ${x + width - 4} ${centerY - 2}" fill="none" stroke="#628867" stroke-width="1.2" />
        ${renderRepeated(
          width,
          12,
          (offsetX) =>
            `<path d="M${x + offsetX} ${baseY} l0.8 -4 l1.4 4 l1 -3.2" fill="none" stroke="#5b7857" stroke-width="0.7" stroke-linecap="round" stroke-linejoin="round" />`,
        )}`
    case 'streetFurniture':
      return renderRepeated(width, 18, (offsetX) => renderFurnitureIcon(x + offsetX, baseY))
    case 'parking':
      return renderRepeated(
        width,
        18,
        (offsetX) =>
          `<text x="${x + offsetX}" y="${centerY + 2}" text-anchor="middle" font-family="${svgSans}" font-size="5.6" font-weight="700" fill="rgba(46,52,57,0.35)">P</text>`,
      )
    case 'median':
      return renderRepeated(
        width,
        9,
        (offsetX) =>
          `<path d="M${x + offsetX - 2} ${y + 6} l4 6 l-4 6" fill="none" stroke="#ae9b7f" stroke-width="0.9" />`,
      )
    default:
      return ''
  }
}

function renderBikeIcon(centerX: number, centerY: number) {
  return `<g transform="translate(${centerX} ${centerY})" stroke="#23584f" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-4.3" cy="3.2" r="2.4" />
    <circle cx="4.3" cy="3.2" r="2.4" />
    <path d="M-4.2 3.2 L-0.4 -1.4 L2.2 3.2 M-0.4 -1.4 L3 -1.4 L4.4 3.2 M-0.2 -1.2 L-2.6 3.2" />
    <path d="M0.8 -4.2 h3" />
  </g>`
}

function renderLeafCluster(centerX: number, baselineY: number) {
  return `<g transform="translate(${centerX} ${baselineY})" stroke="#527052" stroke-width="0.7" fill="rgba(110,148,88,0.12)" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 0 c1.8 -3.5 4.2 -3.4 5.1 0 c-2.1 0.8 -3.8 1 -5.1 0z" />
    <path d="M0 0 c-1.6 -3.2 -3.9 -3 -4.8 0 c1.9 0.8 3.5 1 4.8 0z" />
    <path d="M0 0 v4.2" />
  </g>`
}

function renderFurnitureIcon(centerX: number, baselineY: number) {
  return `<g transform="translate(${centerX} ${baselineY})" stroke="#815f44" stroke-width="0.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-4 0 h6 v-2.4 h-6 z" fill="rgba(129,95,68,0.16)" />
    <path d="M-3.2 0 v2.4 M1.2 0 v2.4" />
    <path d="M4 -5 v7" />
    <circle cx="4" cy="-6.6" r="1.4" fill="rgba(129,95,68,0.18)" />
  </g>`
}

function renderRepeated(
  width: number,
  spacing: number,
  renderItem: (offsetX: number, index: number) => string,
) {
  const count = Math.max(1, Math.floor(width / spacing))

  return Array.from({ length: count }, (_, index) => {
    const offsetX = round((width / (count + 1)) * (index + 1))
    return renderItem(offsetX, index)
  }).join('')
}

function renderDimensionLine(
  x1: number,
  x2: number,
  sourceY: number,
  dimensionY: number,
  label: string,
) {
  const safeLabel = escapeXml(label)
  const centerX = round((x1 + x2) / 2)

  return `<g>
    <line x1="${round(x1)}" y1="${round(sourceY)}" x2="${round(x1)}" y2="${round(dimensionY)}" stroke="#c4beb3" stroke-width="0.7" />
    <line x1="${round(x2)}" y1="${round(sourceY)}" x2="${round(x2)}" y2="${round(dimensionY)}" stroke="#c4beb3" stroke-width="0.7" />
    <line x1="${round(x1 + 1.8)}" y1="${round(dimensionY)}" x2="${round(x2 - 1.8)}" y2="${round(dimensionY)}" stroke="#5f696f" stroke-width="0.9" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
    <text x="${centerX}" y="${round(dimensionY - 2.8)}" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="#63706d">${safeLabel}</text>
  </g>`
}

function renderLayer(id: string, label: string, content: string) {
  return `<g id="layer-${id}" data-layer="${escapeXml(label)}" inkscape:groupmode="layer" inkscape:label="${escapeXml(label)}">
    ${content}
  </g>`
}

function toScaleMillimeters(widthInMeters: number, scale: number) {
  return round((widthInMeters * 1000) / scale)
}

function formatMeters(value: number) {
  const normalizedValue = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, '')

  return `${normalizedValue.replace('.', ',')} m`
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function round(value: number) {
  return Number(value.toFixed(2))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
