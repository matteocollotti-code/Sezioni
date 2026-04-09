import {
  calculateMetrics,
  elementDefinitions,
  paletteOrder,
} from '../data/sectionLibrary'
import { treeSymbols } from '../data/treeSymbols'
import { urbanIconSymbols } from '../data/urbanIconSymbols'
import type { ExportModel, ExportVariant, SectionElement } from '../types'

interface SegmentLayout {
  element: SectionElement
  sourceIndex: number
  x: number
  width: number
}

const svgSans = "'Manrope', 'Segoe UI', sans-serif"

export function generateRoadSectionSvg(
  { projectTitle, scale, elements }: ExportModel,
  variant: ExportVariant = 'illustrated',
) {
  const safeScale = Math.max(25, scale)
  const metrics = calculateMetrics(elements)
  const totalWidthMm = toScaleMillimeters(metrics.totalWidth, safeScale)
  const canvasWidth = round(Math.max(totalWidthMm + 48, 260))
  const drawingX = round((canvasWidth - totalWidthMm) / 2)
  const sectionHeight = 44
  const headerDividerY = 34

  let currentX = drawingX
  const layouts = elements.map<SegmentLayout>((element, sourceIndex) => {
    const width = toScaleMillimeters(element.width, safeScale)
    const layout = {
      element,
      sourceIndex,
      x: currentX,
      width,
    }

    currentX = round(currentX + width)
    return layout
  })

  const maxTreeHeightMm = layouts.reduce((maxHeight, segment) => {
    if (segment.element.type !== 'treeStrip') {
      return maxHeight
    }

    return Math.max(maxHeight, getTreeHeightMm(segment.element, safeScale))
  }, 0)

  const sectionBottom = round(Math.max(100, headerDividerY + maxTreeHeightMm + 20))
  const sectionY = round(sectionBottom - sectionHeight)
  const segmentDimensionY = round(sectionBottom + 16)
  const totalDimensionY = round(segmentDimensionY + 18)
  const scaleBarY = round(totalDimensionY + 14)
  const isClean = variant === 'clean'
  const annotationGuideY = round(scaleBarY + 10)
  const annotationIconY = round(annotationGuideY + 9)
  const annotationLabelY = round(annotationIconY + 9)
  const canvasHeight = round(
    isClean ? scaleBarY + 18 : annotationLabelY + 18,
  )
  const subtitle = isClean
    ? `SVG clean in scala 1:${safeScale}`
    : `SVG vettoriale illustrato in scala 1:${safeScale}`
  const tallestTreeMeters = layouts.reduce((maxHeight, segment) => {
    if (segment.element.type !== 'treeStrip') {
      return maxHeight
    }

    return Math.max(maxHeight, segment.element.treeHeight ?? 0)
  }, 0)

  const usedTypes = paletteOrder.filter((type) =>
    layouts.some((segment) => segment.element.type === type),
  )

  const elementLayersMarkup = usedTypes
    .map((type) => {
      const definition = elementDefinitions[type]
      const layerMarkup = layouts
        .filter((segment) => segment.element.type === type)
        .map((segment) =>
          renderSegment(segment, sectionY, sectionHeight, sectionBottom, safeScale, variant),
        )
        .join('')

      return renderLayer(
        `element-${slugify(type)}`,
        `Elemento - ${definition.label}`,
        layerMarkup,
      )
    })
    .join('')

  const segmentDimensions = layouts
    .filter((segment) => segment.width >= 12)
    .map((segment) =>
      renderDimensionLine(
        segment.x,
        segment.x + segment.width,
        sectionBottom,
        segmentDimensionY,
        formatMeters(segment.element.width),
      ),
    )
    .join('')

  const legendParts = [
    `${metrics.totalWidth.toFixed(1)} m complessivi`,
    `${metrics.greenWidth.toFixed(1)} m di verde`,
  ]

  if (tallestTreeMeters > 0) {
    legendParts.push(`alberi fino a ${tallestTreeMeters.toFixed(1)} m`)
  }

  const legendSummary = legendParts.join(' - ').replaceAll('.', ',')

  const scaleBarMeters =
    metrics.totalWidth >= 18 ? 5 : metrics.totalWidth >= 10 ? 2 : 1
  const scaleBarWidth = toScaleMillimeters(scaleBarMeters, safeScale)
  const scaleBarX = round(canvasWidth - drawingX - scaleBarWidth)
  const sectionFrameMarkup = renderLayer(
    'section-frame',
    'Telaio sezione',
    renderSectionFrame(drawingX, totalWidthMm, sectionY, sectionBottom),
  )
  const annotationMarkup = isClean
    ? ''
    : renderLayer(
        'annotations',
        'Annotazioni',
        renderSegmentAnnotations(layouts, annotationGuideY, annotationIconY, annotationLabelY),
      )

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
    `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff" />
  <rect x="6" y="6" width="${canvasWidth - 12}" height="${canvasHeight - 12}" fill="none" stroke="#d4d7da" stroke-width="0.6" />
  <path d="M12 ${headerDividerY} H${canvasWidth - 12}" stroke="#cfd3d6" stroke-width="0.7" />`,
  )}
  ${renderLayer(
    'header',
    'Testata',
    `<text x="${drawingX}" y="16" font-family="${svgSans}" font-size="4.2" font-weight="800" letter-spacing="0.18" fill="#1f2528">${escapeXml(projectTitle.toUpperCase())}</text>
  <text x="${drawingX}" y="25.2" font-family="${svgSans}" font-size="3.6" letter-spacing="0.2" fill="#6a7379">${escapeXml(subtitle)} | ref. Benghazi Street Sections</text>
  <text x="${canvasWidth - drawingX}" y="16" text-anchor="end" font-family="${svgSans}" font-size="4.2" font-weight="700" letter-spacing="0.12" fill="#1f2528">${escapeXml(formatMeters(metrics.totalWidth))}</text>
  <text x="${canvasWidth - drawingX}" y="25.2" text-anchor="end" font-family="${svgSans}" font-size="3.5" fill="#6a7379">${escapeXml(legendSummary)}</text>`,
  )}
  ${sectionFrameMarkup}
  ${elementLayersMarkup}
  ${renderLayer('dimensions-elements', 'Quote elementi', segmentDimensions)}
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
  ${annotationMarkup}
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
  sectionBottom: number,
  scale: number,
  variant: ExportVariant,
) {
  const definition = elementDefinitions[segment.element.type]
  const x = round(segment.x)
  const width = round(segment.width)
  const treeMarkup =
    segment.element.type === 'treeStrip'
      ? renderTreeDetail(segment, sectionBottom, scale, variant)
      : ''

  return `<g id="segment-${segment.sourceIndex + 1}" data-segment-index="${segment.sourceIndex + 1}" data-type="${escapeXml(segment.element.type)}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="0.8" fill="${getExportFill(definition.fill, variant)}" stroke="${getExportStroke(definition.stroke, variant)}" stroke-width="0.7" />
    ${treeMarkup}
  </g>`
}

function renderTreeDetail(
  segment: SegmentLayout,
  sectionBottom: number,
  scale: number,
  variant: ExportVariant,
) {
  const treeHeightMeters = getTreeHeightMeters(segment.element)
  const treeHeightMm = toScaleMillimeters(treeHeightMeters, scale)
  const groundY = round(sectionBottom - 2)
  const topY = round(groundY - treeHeightMm)
  const dimensionX = round(segment.x + Math.max(5, Math.min(segment.width - 5, segment.width * 0.84)))
  const dimensionMarkup = renderVerticalDimensionLine(
    dimensionX,
    topY,
    groundY,
    `H ${formatMeters(treeHeightMeters)}`,
  )

  if (variant === 'clean') {
    return dimensionMarkup
  }

  const symbol = treeSymbols[segment.sourceIndex % treeSymbols.length]
  const treeWidthMm = clampNumber(
    round(treeHeightMm * 0.62),
    Math.max(segment.width * 1.5, 30),
    Math.max(segment.width * 3.1, 42),
  )
  const xScale = round(treeWidthMm / symbol.width)
  const yScale = round(treeHeightMm / symbol.height)
  const treeX = round(segment.x + segment.width / 2 - treeWidthMm / 2)
  const treeY = topY

  return `<g data-tree-source="${escapeXml(symbol.name)}">
    <g transform="translate(${treeX} ${treeY}) scale(${xScale} ${yScale})">
      <path d="${symbol.path}" fill="#1d2f26" opacity="0.92" />
    </g>
    ${dimensionMarkup}
  </g>`
}


function renderSegmentAnnotations(
  layouts: SegmentLayout[],
  guideY: number,
  iconY: number,
  labelY: number,
) {
  const guideMarkup = `<path d="M12 ${guideY} H${round(
    layouts.length > 0 ? layouts[layouts.length - 1].x + layouts[layouts.length - 1].width + 12 : 248,
  )}" stroke="#d3d7da" stroke-width="0.6" />`

  const itemsMarkup = layouts
    .map((segment) => renderSegmentAnnotation(segment, iconY, labelY))
    .join('')

  return `${guideMarkup}${itemsMarkup}`
}

function renderSegmentAnnotation(
  segment: SegmentLayout,
  iconY: number,
  labelY: number,
) {
  const definition = elementDefinitions[segment.element.type]
  const centerX = round(segment.x + segment.width / 2)
  const label =
    segment.width < 18
      ? definition.shortLabel.toUpperCase()
      : definition.label
  const treeNote =
    segment.element.type === 'treeStrip' && segment.element.treeHeight !== undefined
      ? `h ${formatMeters(segment.element.treeHeight)}`
      : ''

  return `<g data-annotation-index="${segment.sourceIndex + 1}">
    <line x1="${centerX}" y1="${round(iconY - 8)}" x2="${centerX}" y2="${round(iconY - 2.4)}" stroke="#c8cdd1" stroke-width="0.55" />
    ${renderLegendIcon(segment, centerX, iconY)}
    <text x="${centerX}" y="${labelY}" text-anchor="middle" font-family="${svgSans}" font-size="3.5" font-weight="700" fill="#32403d">
      ${escapeXml(label)}
    </text>
    ${
      treeNote
        ? `<text x="${centerX}" y="${round(labelY + 5)}" text-anchor="middle" font-family="${svgSans}" font-size="3.1" fill="#63706d">${escapeXml(treeNote)}</text>`
        : ''
    }
  </g>`
}

function renderLegendIcon(segment: SegmentLayout, centerX: number, centerY: number) {
  switch (segment.element.type) {
    case 'lane':
      return `<line x1="${round(centerX - 7)}" y1="${centerY}" x2="${round(centerX + 7)}" y2="${centerY}" stroke="#32373b" stroke-width="1.05" stroke-dasharray="4 2.8" />`
    case 'cycleway':
      return renderBikeIcon(centerX, centerY - 2)
    case 'sidewalk':
      return `<g stroke="#44494d" stroke-width="0.8">
        <line x1="${round(centerX - 4)}" y1="${round(centerY - 4)}" x2="${round(centerX - 4)}" y2="${round(centerY + 4)}" />
        <line x1="${centerX}" y1="${round(centerY - 4)}" x2="${centerX}" y2="${round(centerY + 4)}" />
        <line x1="${round(centerX + 4)}" y1="${round(centerY - 4)}" x2="${round(centerX + 4)}" y2="${round(centerY + 4)}" />
      </g>`
    case 'treeStrip': {
      const symbol = treeSymbols[segment.sourceIndex % treeSymbols.length]
      const scale = round(9 / symbol.height)
      const x = round(centerX - (symbol.width * scale) / 2)
      const y = round(centerY - 6)

      return `<g transform="translate(${x} ${y}) scale(${scale} ${scale})">
        <path d="${symbol.path}" fill="#2c4f37" opacity="0.92" />
      </g>`
    }
    case 'plantedBed':
      return renderImportedIcon(
        urbanIconSymbols.plantedBed,
        centerX,
        centerY + 1,
        11,
        '#424b40',
      )
    case 'lawn':
      return `<path d="M${round(centerX - 4)} ${round(centerY + 4)} l1.6 -5 l1.6 5 l1.4 -4.1 l1.4 4.1 l1.6 -5 l1.7 5" fill="none" stroke="#465247" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />`
    case 'bioswale':
      return `<path d="M${round(centerX - 8)} ${round(centerY + 2)} C${round(centerX - 3)} ${round(centerY - 4)}, ${round(centerX + 1)} ${round(centerY + 5)}, ${round(centerX + 8)} ${round(centerY - 1)}" fill="none" stroke="#49574c" stroke-width="1.05" stroke-linecap="round" />`
    case 'streetFurniture':
      return renderImportedIcon(
        urbanIconSymbols.streetFurniture,
        centerX,
        centerY + 2,
        10,
        '#47413e',
      )
    case 'parking':
      return `<text x="${centerX}" y="${round(centerY + 2)}" text-anchor="middle" font-family="${svgSans}" font-size="5.6" font-weight="700" fill="#41484d">P</text>`
    case 'median':
      return `<path d="M${round(centerX - 5)} ${round(centerY - 4)} l4 6 l-4 6 M${round(centerX + 1)} ${round(centerY - 4)} l4 6 l-4 6" fill="none" stroke="#5a5a52" stroke-width="0.9" />`
    default:
      return ''
  }
}

function renderBikeIcon(centerX: number, centerY: number) {
  return `<g transform="translate(${centerX} ${centerY})" stroke="#394246" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-4.3" cy="3.2" r="2.4" />
    <circle cx="4.3" cy="3.2" r="2.4" />
    <path d="M-4.2 3.2 L-0.4 -1.4 L2.2 3.2 M-0.4 -1.4 L3 -1.4 L4.4 3.2 M-0.2 -1.2 L-2.6 3.2" />
    <path d="M0.8 -4.2 h3" />
  </g>`
}

function renderImportedIcon(
  symbol: { name: string; width: number; height: number; path: string },
  centerX: number,
  centerY: number,
  targetHeight: number,
  fill: string,
) {
  const scale = round(targetHeight / symbol.height)
  const width = round(symbol.width * scale)
  const height = round(symbol.height * scale)
  const x = round(centerX - width / 2)
  const y = round(centerY - height / 2)

  return `<g data-icon-source="${escapeXml(symbol.name)}" transform="translate(${x} ${y}) scale(${scale} ${scale})">
    <path d="${symbol.path}" fill="${fill}" opacity="0.9" />
  </g>`
}

function renderSectionFrame(
  drawingX: number,
  totalWidthMm: number,
  sectionY: number,
  sectionBottom: number,
) {
  const endX = round(drawingX + totalWidthMm)
  const topY = round(sectionY)
  const bottomY = round(sectionBottom)

  return `<g>
    <line x1="${drawingX}" y1="${topY}" x2="${endX}" y2="${topY}" stroke="#34393d" stroke-width="0.9" />
    <line x1="${drawingX}" y1="${bottomY}" x2="${endX}" y2="${bottomY}" stroke="#34393d" stroke-width="0.9" />
    <line x1="${drawingX}" y1="${round(topY - 2.4)}" x2="${drawingX}" y2="${round(bottomY + 2.4)}" stroke="#34393d" stroke-width="0.7" />
    <line x1="${endX}" y1="${round(topY - 2.4)}" x2="${endX}" y2="${round(bottomY + 2.4)}" stroke="#34393d" stroke-width="0.7" />
  </g>`
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

function renderVerticalDimensionLine(
  x: number,
  y1: number,
  y2: number,
  label: string,
) {
  const safeLabel = escapeXml(label)
  const centerY = round((y1 + y2) / 2)
  const labelX = round(x + 6)

  return `<g>
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#5f696f" stroke-width="0.9" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
    <line x1="${x - 2.8}" y1="${y1}" x2="${x + 2.8}" y2="${y1}" stroke="#c4beb3" stroke-width="0.7" />
    <line x1="${x - 2.8}" y1="${y2}" x2="${x + 2.8}" y2="${y2}" stroke="#c4beb3" stroke-width="0.7" />
    <text x="${labelX}" y="${centerY}" transform="rotate(-90 ${labelX} ${centerY})" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="#63706d">${safeLabel}</text>
  </g>`
}

function renderLayer(id: string, label: string, content: string) {
  return `<g id="layer-${id}" data-layer="${escapeXml(label)}" inkscape:groupmode="layer" inkscape:label="${escapeXml(label)}">
    ${content}
  </g>`
}

function getTreeHeightMeters(element: SectionElement) {
  return (
    element.treeHeight ??
    elementDefinitions.treeStrip.treeHeightControl?.defaultValue ??
    12
  )
}

function getTreeHeightMm(element: SectionElement, scale: number) {
  return toScaleMillimeters(getTreeHeightMeters(element), scale)
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

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getExportFill(fill: string, variant: ExportVariant) {
  return mixHex(fill, '#ffffff', variant === 'clean' ? 0.36 : 0.22)
}

function getExportStroke(stroke: string, variant: ExportVariant) {
  return mixHex(stroke, '#1f2528', variant === 'clean' ? 0.18 : 0.1)
}

function mixHex(colorA: string, colorB: string, amount: number) {
  const a = parseHexColor(colorA)
  const b = parseHexColor(colorB)

  if (!a || !b) {
    return colorA
  }

  const t = clampNumber(amount, 0, 1)
  const mix = (valueA: number, valueB: number) =>
    Math.round(valueA + (valueB - valueA) * t)

  return `#${[mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2])]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`
}

function parseHexColor(value: string) {
  const normalized = value.trim().replace('#', '')

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null
  }

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ]
}
