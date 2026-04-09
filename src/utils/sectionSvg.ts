import {
  calculateMetrics,
  elementDefinitions,
  paletteOrder,
} from "../data/sectionLibrary"
import { treeIllustrations } from "../data/treeIllustrations"
import { urbanIconSymbols } from "../data/urbanIconSymbols"
import type { ExportModel, ExportVariant, SectionElement } from "../types"

interface SegmentLayout {
  element: SectionElement
  sourceIndex: number
  x: number
  width: number
}

interface BuildingContext {
  side: "left" | "right"
  label: string
  height: number
  heightMm: number
  x: number
  width: number
}

const svgSans = "'Manrope', 'Segoe UI', sans-serif"

const svgPalette = {
  paper: "#f3f7fb",
  paperBorder: "#d1dceb",
  divider: "#d7e1ec",
  ink: "#15263f",
  inkSoft: "#667b95",
  frame: "#23374f",
  dimension: "#4f637d",
  guide: "#c7d3df",
  scale: "#20344d",
  asphalt: "#324a63",
  asphaltTop: "#4a6480",
  asphaltShade: "#213448",
  roadMark: "#f7f7f0",
  roadMarkSoft: "#cfdae6",
  cycleMark: "#eef9ff",
  sidewalkJoint: "#b8ad9e",
  curb: "#7d90a4",
  soil: "#776a59",
  soilShade: "#625545",
  planting: "#5f8260",
  plantingSoft: "#8baa82",
  lawnBlade: "#86a468",
  water: "#5b7a97",
  furniture: "#455e76",
  furnitureLight: "#dbe5ef",
  parkingMark: "#eef4fb",
  medianPost: "#41576f",
  shadow: "#102132",
  building: "#203549",
  buildingAccent: "#3c536c",
  buildingWindow: "#edf4fb",
}

export function generateRoadSectionSvg(
  {
    projectTitle,
    scale,
    elements,
    leftBuildingHeight,
    rightBuildingHeight,
  }: ExportModel,
  variant: ExportVariant = "illustrated"
) {
  const safeScale = Math.max(25, scale)
  const metrics = calculateMetrics(elements)
  const totalWidthMm = toScaleMillimeters(metrics.totalWidth, safeScale)
  const outerMargin = 14
  const contextGap = 8
  const minSideContextWidth = 28
  const canvasWidth = round(
    Math.max(
      totalWidthMm + outerMargin * 2 + (minSideContextWidth + contextGap) * 2,
      340
    )
  )
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

  const normalizedLeftBuildingHeight = clampNumber(leftBuildingHeight, 0, 999)
  const normalizedRightBuildingHeight = clampNumber(rightBuildingHeight, 0, 999)
  const maxTreeHeightMm = layouts.reduce((maxHeight, segment) => {
    if (segment.element.type !== "treeStrip") {
      return maxHeight
    }

    return Math.max(maxHeight, getTreeHeightMm(segment.element, safeScale))
  }, 0)

  const leftBuildingHeightMm = toScaleMillimeters(
    normalizedLeftBuildingHeight,
    safeScale
  )
  const rightBuildingHeightMm = toScaleMillimeters(
    normalizedRightBuildingHeight,
    safeScale
  )
  const sectionBottom = round(
    Math.max(
      108,
      headerDividerY + Math.max(maxTreeHeightMm, leftBuildingHeightMm, rightBuildingHeightMm) + 22
    )
  )
  const sectionY = round(sectionBottom - sectionHeight)
  const segmentDimensionY = round(sectionBottom + 16)
  const totalDimensionY = round(segmentDimensionY + 18)
  const contextDimensionY = round(totalDimensionY + 18)
  const scaleBarY = round(contextDimensionY + 14)
  const isClean = variant === "clean"
  const annotationGuideY = round(scaleBarY + 10)
  const annotationIconY = round(annotationGuideY + 9)
  const annotationLabelY = round(annotationIconY + 9)
  const canvasHeight = round(isClean ? scaleBarY + 18 : annotationLabelY + 18)
  const subtitle = isClean
    ? `SVG clean in scala 1:${safeScale}`
    : `SVG illustrato in scala 1:${safeScale}`

  const tallestTreeMeters = layouts.reduce((maxHeight, segment) => {
    if (segment.element.type !== "treeStrip") {
      return maxHeight
    }

    return Math.max(maxHeight, segment.element.treeHeight ?? 0)
  }, 0)

  const usedTypes = paletteOrder.filter((type) =>
    layouts.some((segment) => segment.element.type === type)
  )

  const leftBuildingWidth = round(Math.max(16, drawingX - outerMargin - contextGap))
  const rightBuildingX = round(drawingX + totalWidthMm + contextGap)
  const rightBuildingWidth = round(
    Math.max(16, canvasWidth - outerMargin - rightBuildingX)
  )
  const buildings: BuildingContext[] = [
    {
      side: "left",
      label: "Edificio sinistro",
      height: normalizedLeftBuildingHeight,
      heightMm: leftBuildingHeightMm,
      x: outerMargin,
      width: leftBuildingWidth,
    },
    {
      side: "right",
      label: "Edificio destro",
      height: normalizedRightBuildingHeight,
      heightMm: rightBuildingHeightMm,
      x: rightBuildingX,
      width: rightBuildingWidth,
    },
  ]

  const elementLayersMarkup = usedTypes
    .map((type) => {
      const definition = elementDefinitions[type]
      const layerMarkup = layouts
        .filter((segment) => segment.element.type === type)
        .map((segment) =>
          renderSegment(
            segment,
            layouts,
            sectionY,
            sectionHeight,
            sectionBottom,
            safeScale,
            variant
          )
        )
        .join("")

      return renderLayer(
        `element-${slugify(type)}`,
        `Elemento - ${definition.label}`,
        layerMarkup
      )
    })
    .join("")

  const segmentDimensions = layouts
    .filter((segment) => segment.width >= 12)
    .map((segment) =>
      renderDimensionLine(
        segment.x,
        segment.x + segment.width,
        sectionBottom,
        segmentDimensionY,
        formatMeters(segment.element.width)
      )
    )
    .join("")

  const contextDimensions = buildings
    .filter((building) => building.height > 0)
    .map((building) =>
      renderVerticalDimensionLine(
        getBuildingDimensionX(building, contextGap),
        round(sectionBottom - building.heightMm),
        sectionBottom,
        `H ${formatMeters(building.height)}`
      )
    )
    .join("")

  const legendParts = [
    `${metrics.totalWidth.toFixed(1)} m complessivi`,
    `${metrics.greenWidth.toFixed(1)} m di verde`,
  ]

  if (tallestTreeMeters > 0) {
    legendParts.push(`alberi fino a ${tallestTreeMeters.toFixed(1)} m`)
  }

  const tallestBuildingMeters = Math.max(
    normalizedLeftBuildingHeight,
    normalizedRightBuildingHeight
  )

  if (tallestBuildingMeters > 0) {
    legendParts.push(`edifici fino a ${tallestBuildingMeters.toFixed(1)} m`)
  }

  const legendSummary = legendParts.join(" - ").replaceAll(".", ",")

  const scaleBarMeters =
    metrics.totalWidth >= 18 ? 5 : metrics.totalWidth >= 10 ? 2 : 1
  const scaleBarWidth = toScaleMillimeters(scaleBarMeters, safeScale)
  const scaleBarX = round(canvasWidth - drawingX - scaleBarWidth)
  const annotationMarkup = isClean
    ? ""
    : renderLayer(
        "annotations",
        "Annotazioni",
        renderSegmentAnnotations(layouts, annotationGuideY, annotationIconY, annotationLabelY)
      )

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="${canvasWidth}mm" height="${canvasHeight}mm" viewBox="0 0 ${canvasWidth} ${canvasHeight}" role="img" aria-labelledby="section-title section-desc">
  <title id="section-title">${escapeXml(projectTitle)}</title>
  <desc id="section-desc">Sezione stradale quotata, esportata in scala 1:${safeScale}. ${escapeXml(legendSummary)}.</desc>
  <defs>
    <marker id="arrow-start" viewBox="0 0 10 10" refX="4.8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M10 0 L0 5 L10 10" fill="none" stroke="${svgPalette.dimension}" stroke-width="1.1" />
    </marker>
    <marker id="arrow-end" viewBox="0 0 10 10" refX="5.2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
      <path d="M0 0 L10 5 L0 10" fill="none" stroke="${svgPalette.dimension}" stroke-width="1.1" />
    </marker>
    <filter id="tree-ink" color-interpolation-filters="sRGB">
      <feFlood flood-color="#17283f" result="tree-color" />
      <feComposite in="tree-color" in2="SourceAlpha" operator="in" result="tree-shape" />
      <feMerge>
        <feMergeNode in="tree-shape" />
      </feMerge>
    </filter>
  </defs>
  ${renderLayer(
    "background",
    "Sfondo",
    `<rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" fill="${svgPalette.paper}" />
  <rect x="6" y="6" width="${canvasWidth - 12}" height="${canvasHeight - 12}" fill="none" stroke="${svgPalette.paperBorder}" stroke-width="0.6" />
  <path d="M12 ${headerDividerY} H${canvasWidth - 12}" stroke="${svgPalette.divider}" stroke-width="0.7" />`
  )}
  ${renderLayer(
    "header",
    "Testata",
    `<text x="${drawingX}" y="16" font-family="${svgSans}" font-size="4.2" font-weight="800" letter-spacing="0.18" fill="${svgPalette.ink}">${escapeXml(projectTitle.toUpperCase())}</text>
  <text x="${drawingX}" y="25.2" font-family="${svgSans}" font-size="3.6" letter-spacing="0.2" fill="${svgPalette.inkSoft}">${escapeXml(subtitle)}</text>
  <text x="${canvasWidth - drawingX}" y="16" text-anchor="end" font-family="${svgSans}" font-size="4.2" font-weight="700" letter-spacing="0.12" fill="${svgPalette.ink}">${escapeXml(formatMeters(metrics.totalWidth))}</text>
  <text x="${canvasWidth - drawingX}" y="25.2" text-anchor="end" font-family="${svgSans}" font-size="3.5" fill="${svgPalette.inkSoft}">${escapeXml(legendSummary)}</text>`
  )}
  ${renderLayer(
    "building-left",
    "Edificio sinistro",
    renderBuildingMass(buildings[0], sectionBottom, variant)
  )}
  ${renderLayer(
    "building-right",
    "Edificio destro",
    renderBuildingMass(buildings[1], sectionBottom, variant)
  )}
  ${renderLayer(
    "section-frame",
    "Telaio sezione",
    renderSectionFrame(drawingX, totalWidthMm, sectionY, sectionBottom)
  )}
  ${elementLayersMarkup}
  ${renderLayer("dimensions-elements", "Quote elementi", segmentDimensions)}
  ${renderLayer(
    "dimensions-total",
    "Quote totali",
    renderDimensionLine(
      drawingX,
      drawingX + totalWidthMm,
      sectionBottom,
      totalDimensionY,
      formatMeters(metrics.totalWidth)
    )
  )}
  ${renderLayer("dimensions-context", "Quote contesto", contextDimensions)}
  ${renderLayer(
    "scale-bar",
    "Barra di scala",
    `<g>
    <line x1="${scaleBarX}" y1="${scaleBarY}" x2="${scaleBarX + scaleBarWidth}" y2="${scaleBarY}" stroke="${svgPalette.scale}" stroke-width="1.2" />
    <line x1="${scaleBarX}" y1="${scaleBarY - 2.2}" x2="${scaleBarX}" y2="${scaleBarY + 2.2}" stroke="${svgPalette.scale}" stroke-width="1.2" />
    <line x1="${scaleBarX + scaleBarWidth}" y1="${scaleBarY - 2.2}" x2="${scaleBarX + scaleBarWidth}" y2="${scaleBarY + 2.2}" stroke="${svgPalette.scale}" stroke-width="1.2" />
    <text x="${scaleBarX + scaleBarWidth / 2}" y="${scaleBarY + 6}" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="${svgPalette.inkSoft}">${scaleBarMeters} m reali</text>
  </g>`
  )}
  ${annotationMarkup}
</svg>`
}

export function buildDownloadName(
  projectTitle: string,
  variant: ExportVariant = "illustrated"
) {
  const baseName =
    projectTitle
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sezione-stradale"

  return variant === "clean" ? `${baseName}-clean` : `${baseName}-illustrata`
}

function renderSegment(
  segment: SegmentLayout,
  allSegments: SegmentLayout[],
  y: number,
  height: number,
  sectionBottom: number,
  scale: number,
  variant: ExportVariant
) {
  const definition = elementDefinitions[segment.element.type]
  const x = round(segment.x)
  const width = round(segment.width)
  const illustratedMarkup =
    variant === "illustrated"
      ? renderIllustratedSurfaceDetail(segment, allSegments, y, height, sectionBottom)
      : ""
  const treeMarkup =
    segment.element.type === "treeStrip"
      ? renderTreeDetail(segment, sectionBottom, scale, variant)
      : ""

  return `<g id="segment-${segment.sourceIndex + 1}" data-segment-index="${segment.sourceIndex + 1}" data-type="${escapeXml(segment.element.type)}">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="0.8" fill="${getExportFill(definition.fill, variant)}" stroke="${getExportStroke(definition.stroke, variant)}" stroke-width="0.7" />
    ${illustratedMarkup}
    ${treeMarkup}
  </g>`
}

function renderIllustratedSurfaceDetail(
  segment: SegmentLayout,
  allSegments: SegmentLayout[],
  y: number,
  height: number,
  sectionBottom: number
) {
  switch (segment.element.type) {
    case "lane":
      return renderLaneSurface(segment, allSegments, y, height)
    case "cycleway":
      return renderCyclewaySurface(segment, y, height)
    case "sidewalk":
      return renderSidewalkSurface(segment, y, height)
    case "treeStrip":
      return renderTreeStripSurface(segment, sectionBottom)
    case "plantedBed":
      return renderPlantedBedSurface(segment, sectionBottom)
    case "lawn":
      return renderLawnSurface(segment, sectionBottom)
    case "bioswale":
      return renderBioswaleSurface(segment, y, height, sectionBottom)
    case "streetFurniture":
      return renderStreetFurnitureSurface(segment, sectionBottom)
    case "parking":
      return renderParkingSurface(segment, y, height)
    case "median":
      return renderMedianSurface(segment, y, sectionBottom)
    default:
      return ""
  }
}

function renderLaneSurface(
  segment: SegmentLayout,
  allSegments: SegmentLayout[],
  y: number,
  height: number
) {
  const x = round(segment.x)
  const width = round(segment.width)
  const previous = allSegments[segment.sourceIndex - 1]
  const next = allSegments[segment.sourceIndex + 1]
  const hasPrevLane = previous?.element.type === "lane"
  const hasNextLane = next?.element.type === "lane"
  const topBandY = round(y + 1.2)
  const topBandHeight = 7.4
  const centerStripeY = round(y + 8.7)
  const bottomShadeY = round(y + height - 8.5)

  return `<g>
    <rect x="${x + 0.8}" y="${topBandY}" width="${Math.max(
      width - 1.6,
      0
    )}" height="${topBandHeight}" rx="0.6" fill="${svgPalette.asphaltTop}" opacity="0.8" />
    <rect x="${x + 0.8}" y="${bottomShadeY}" width="${Math.max(
      width - 1.6,
      0
    )}" height="6.8" rx="0.6" fill="${svgPalette.asphaltShade}" opacity="0.45" />
    ${renderDashedSurfaceLine(
      x + 4,
      x + width - 4,
      centerStripeY,
      svgPalette.roadMark,
      width >= 24 ? 5 : 4,
      3
    )}
    ${hasPrevLane ? renderLaneBoundaryPaint(x, y + 2) : ""}
    ${hasNextLane ? renderLaneBoundaryPaint(x + width, y + 2) : ""}
    ${width >= 22 ? renderLaneChevron(x + width / 2, y + height / 2 + 2) : ""}
  </g>`
}

function renderCyclewaySurface(segment: SegmentLayout, y: number, height: number) {
  const x = round(segment.x)
  const width = round(segment.width)
  const iconCount = width >= 24 ? 2 : 1
  const bikeIcons = Array.from({ length: iconCount }, (_, index) => {
    const centerX =
      iconCount === 1
        ? x + width / 2
        : x + (width * (index + 1)) / (iconCount + 1)
    return renderBikeIcon(centerX, y + height / 2 + 3, svgPalette.cycleMark, 1.08, 0.9)
  }).join("")

  return `<g>
    <rect x="${x + 1}" y="${round(y + 1.2)}" width="${Math.max(
      width - 2,
      0
    )}" height="5.8" rx="0.6" fill="#87a6c0" opacity="0.46" />
    <line x1="${x + 2.4}" y1="${round(y + 8.8)}" x2="${x + width - 2.4}" y2="${round(
    y + 8.8
  )}" stroke="${svgPalette.cycleMark}" stroke-width="1.1" stroke-linecap="round" />
    <line x1="${x + 2.4}" y1="${round(y + height - 8.4)}" x2="${x + width - 2.4}" y2="${round(
    y + height - 8.4
  )}" stroke="${svgPalette.cycleMark}" stroke-width="1.1" stroke-linecap="round" opacity="0.75" />
    ${renderDashedSurfaceLine(
      x + 4,
      x + width - 4,
      y + height / 2 - 5,
      svgPalette.cycleMark,
      3.6,
      2.3,
      0.6
    )}
    ${bikeIcons}
  </g>`
}

function renderSidewalkSurface(segment: SegmentLayout, y: number, height: number) {
  const x = round(segment.x)
  const width = round(segment.width)
  return `<g>
    <rect x="${x + 0.8}" y="${round(y + 1.4)}" width="${Math.max(
      width - 1.6,
      0
    )}" height="5.6" rx="0.6" fill="#f7f0e6" opacity="0.72" />
    ${renderPavingJoints(x + 2.2, y + 3, width - 4.4, height - 6)}
  </g>`
}

function renderTreeStripSurface(segment: SegmentLayout, sectionBottom: number) {
  const centerX = round(segment.x + segment.width / 2)
  const soilWidth = clampNumber(segment.width * 0.72, 8, segment.width - 1.6)
  return `<g>
    <ellipse cx="${centerX}" cy="${round(sectionBottom - 4.6)}" rx="${round(
      soilWidth / 2
    )}" ry="3" fill="${svgPalette.shadow}" opacity="0.1" />
    <ellipse cx="${centerX}" cy="${round(sectionBottom - 4.1)}" rx="${round(
      soilWidth / 2
    )}" ry="2.4" fill="${svgPalette.soil}" opacity="0.72" />
    <ellipse cx="${centerX}" cy="${round(sectionBottom - 4.7)}" rx="${round(
      soilWidth / 2.8
    )}" ry="1.2" fill="${svgPalette.soilShade}" opacity="0.65" />
  </g>`
}

function renderPlantedBedSurface(segment: SegmentLayout, sectionBottom: number) {
  const x = round(segment.x)
  const width = round(segment.width)
  const centerX = x + width / 2
  return `<g>
    <ellipse cx="${centerX}" cy="${round(sectionBottom - 4.4)}" rx="${round(
      Math.max(width * 0.3, 4)
    )}" ry="2.4" fill="${svgPalette.soil}" opacity="0.7" />
    ${renderImportedIcon(
      urbanIconSymbols.plantedBed,
      centerX,
      sectionBottom - 12,
      10,
      svgPalette.planting
    )}
    ${width >= 14
      ? renderImportedIcon(
          urbanIconSymbols.plantedBed,
          x + width * 0.28,
          sectionBottom - 10.8,
          8,
          svgPalette.plantingSoft
        )
      : ""}
    ${width >= 14
      ? renderImportedIcon(
          urbanIconSymbols.plantedBed,
          x + width * 0.72,
          sectionBottom - 10.8,
          8,
          svgPalette.plantingSoft
        )
      : ""}
  </g>`
}

function renderLawnSurface(segment: SegmentLayout, sectionBottom: number) {
  return `<g>
    ${renderGrassTufts(segment.x + 2.5, segment.width - 5, sectionBottom - 2.4)}
  </g>`
}

function renderBioswaleSurface(
  segment: SegmentLayout,
  y: number,
  height: number,
  sectionBottom: number
) {
  const x = round(segment.x)
  const width = round(segment.width)
  return `<g>
    <path d="M${x + 2} ${round(y + height - 9)} C${round(x + width * 0.28)} ${round(
      y + height - 2.8
    )}, ${round(x + width * 0.64)} ${round(y + height - 2.8)}, ${round(
      x + width - 2
    )} ${round(y + height - 9)}" fill="none" stroke="${svgPalette.water}" stroke-width="1.25" stroke-linecap="round" />
    <path d="M${x + 2.8} ${round(sectionBottom - 4)} C${round(x + width * 0.3)} ${round(
      sectionBottom + 0.5
    )}, ${round(x + width * 0.68)} ${round(sectionBottom + 0.5)}, ${round(
      x + width - 2.8
    )} ${round(sectionBottom - 4)}" fill="none" stroke="${svgPalette.soilShade}" stroke-width="0.85" opacity="0.7" />
    ${renderReedCluster(x + width * 0.3, sectionBottom - 4.2)}
    ${renderReedCluster(x + width * 0.72, sectionBottom - 4.2)}
  </g>`
}

function renderStreetFurnitureSurface(segment: SegmentLayout, sectionBottom: number) {
  const centerX = round(segment.x + segment.width / 2)
  const lampX = round(segment.x + segment.width * 0.78)
  return `<g>
    ${renderImportedIcon(
      urbanIconSymbols.streetFurniture,
      centerX,
      sectionBottom - 8.6,
      9.6,
      svgPalette.furniture
    )}
    <line x1="${lampX}" y1="${round(sectionBottom - 16)}" x2="${lampX}" y2="${round(
    sectionBottom - 4.4
  )}" stroke="${svgPalette.furniture}" stroke-width="0.85" />
    <circle cx="${lampX}" cy="${round(sectionBottom - 17.2)}" r="1.3" fill="${svgPalette.furnitureLight}" stroke="${svgPalette.furniture}" stroke-width="0.55" />
  </g>`
}

function renderParkingSurface(segment: SegmentLayout, y: number, height: number) {
  const x = round(segment.x)
  const width = round(segment.width)
  return `<g>
    <rect x="${x + 0.8}" y="${round(y + 1.2)}" width="${Math.max(
      width - 1.6,
      0
    )}" height="6.4" rx="0.6" fill="${svgPalette.asphaltTop}" opacity="0.56" />
    <line x1="${x + 3.2}" y1="${round(y + 6.4)}" x2="${x + 3.2}" y2="${round(
    y + height - 5.2
  )}" stroke="${svgPalette.parkingMark}" stroke-width="0.9" />
    <line x1="${x + width - 3.2}" y1="${round(y + 6.4)}" x2="${x + width - 3.2}" y2="${round(
    y + height - 5.2
  )}" stroke="${svgPalette.parkingMark}" stroke-width="0.9" />
    <text x="${x + width / 2}" y="${round(y + height / 2 + 4)}" text-anchor="middle" font-family="${svgSans}" font-size="7.4" font-weight="700" fill="${svgPalette.parkingMark}" opacity="0.82">P</text>
  </g>`
}

function renderMedianSurface(
  segment: SegmentLayout,
  y: number,
  sectionBottom: number
) {
  const centerX = round(segment.x + segment.width / 2)
  return `<g>
    <rect x="${round(segment.x + 0.8)}" y="${round(y + 2)}" width="${round(
      Math.max(segment.width - 1.6, 0)
    )}" height="4.6" rx="0.55" fill="#eef4f9" opacity="0.92" />
    ${renderMedianPost(centerX - 3, sectionBottom - 4.2)}
    ${renderMedianPost(centerX + 3, sectionBottom - 4.2)}
  </g>`
}

function renderDashedSurfaceLine(
  x1: number,
  x2: number,
  y: number,
  color: string,
  dash = 4.2,
  gap = 2.8,
  opacity = 0.9
) {
  if (x2 <= x1) {
    return ""
  }

  return `<line x1="${round(x1)}" y1="${round(y)}" x2="${round(x2)}" y2="${round(
    y
  )}" stroke="${color}" stroke-width="1.15" stroke-linecap="round" stroke-dasharray="${dash} ${gap}" opacity="${opacity}" />`
}

function renderLaneBoundaryPaint(x: number, y: number) {
  return `<rect x="${round(x - 0.45)}" y="${round(y)}" width="0.9" height="6.4" rx="0.35" fill="${svgPalette.roadMark}" opacity="0.9" />`
}

function renderLaneChevron(centerX: number, centerY: number) {
  return `<path d="M${round(centerX - 4)} ${round(centerY + 3)} l4 -6 l4 6" fill="none" stroke="${svgPalette.roadMarkSoft}" stroke-width="0.95" stroke-linecap="round" stroke-linejoin="round" opacity="0.78" />`
}

function renderPavingJoints(
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (width <= 0 || height <= 0) {
    return ""
  }

  const lines: string[] = [
    `<line x1="${round(x)}" y1="${round(y + height * 0.52)}" x2="${round(
      x + width
    )}" y2="${round(y + height * 0.52)}" stroke="${svgPalette.sidewalkJoint}" stroke-width="0.55" opacity="0.8" />`,
  ]
  const spacing = 4.8

  for (let currentX = x + spacing; currentX < x + width - spacing / 2; currentX += spacing) {
    lines.push(
      `<line x1="${round(currentX)}" y1="${round(y)}" x2="${round(
        currentX
      )}" y2="${round(y + height)}" stroke="${svgPalette.sidewalkJoint}" stroke-width="0.48" opacity="0.7" />`
    )
  }

  return lines.join("")
}

function renderGrassTufts(x: number, width: number, baseY: number) {
  if (width <= 0) {
    return ""
  }

  const tufts: string[] = []
  const count = Math.max(3, Math.floor(width / 5))

  for (let index = 0; index < count; index += 1) {
    const centerX = x + (width * index) / Math.max(count - 1, 1)
    tufts.push(
      `<path d="M${round(centerX - 1.6)} ${round(baseY)} l1 -4 l1 4 l1.2 -5 l1.1 5 l1 -3.6 l0.9 3.6" fill="none" stroke="${svgPalette.lawnBlade}" stroke-width="0.82" stroke-linecap="round" stroke-linejoin="round" opacity="0.88" />`
    )
  }

  return tufts.join("")
}

function renderReedCluster(centerX: number, baseY: number) {
  return `<g stroke="${svgPalette.planting}" stroke-width="0.8" stroke-linecap="round">
    <path d="M${round(centerX - 1.6)} ${round(baseY)} q0.9 -4.2 0.8 -8" fill="none" />
    <path d="M${round(centerX)} ${round(baseY)} q0.4 -5 0 -9" fill="none" />
    <path d="M${round(centerX + 1.6)} ${round(baseY)} q-0.9 -4.1 -0.8 -7.6" fill="none" />
  </g>`
}

function renderMedianPost(centerX: number, baseY: number) {
  return `<g>
    <rect x="${round(centerX - 0.9)}" y="${round(baseY - 5.6)}" width="1.8" height="5.6" rx="0.6" fill="${svgPalette.medianPost}" />
    <rect x="${round(centerX - 1.4)}" y="${round(baseY - 6.4)}" width="2.8" height="1.3" rx="0.55" fill="${svgPalette.roadMark}" opacity="0.86" />
  </g>`
}

function renderTreeDetail(
  segment: SegmentLayout,
  sectionBottom: number,
  scale: number,
  variant: ExportVariant
) {
  const treeHeightMeters = getTreeHeightMeters(segment.element)
  const treeHeightMm = toScaleMillimeters(treeHeightMeters, scale)
  const groundY = round(sectionBottom - 2)
  const topY = round(groundY - treeHeightMm)
  const dimensionX = round(
    segment.x + Math.max(5, Math.min(segment.width - 5, segment.width * 0.84))
  )
  const dimensionMarkup = renderVerticalDimensionLine(
    dimensionX,
    topY,
    groundY,
    `H ${formatMeters(treeHeightMeters)}`
  )

  if (variant === "clean") {
    return dimensionMarkup
  }

  const illustration = treeIllustrations[segment.sourceIndex % treeIllustrations.length]
  const aspectRatio = illustration.cropWidth / illustration.cropHeight
  const naturalWidthMm = treeHeightMm * aspectRatio
  const treeWidthMm = clampNumber(
    round(naturalWidthMm),
    Math.max(segment.width * 1.2, 18),
    Math.max(segment.width * 2.8, 76)
  )
  const treeX = round(segment.x + segment.width / 2 - treeWidthMm / 2)

  return `<g data-tree-source="${escapeXml(illustration.name)}">
    <ellipse cx="${round(segment.x + segment.width / 2)}" cy="${round(
    sectionBottom - 4.1
  )}" rx="${round(Math.max(segment.width * 0.36, 3.2))}" ry="1.9" fill="${svgPalette.shadow}" opacity="0.12" />
    ${renderTreeIllustration(illustration, treeX, topY, treeWidthMm, treeHeightMm)}
    ${dimensionMarkup}
  </g>`
}

function renderBuildingMass(
  building: BuildingContext,
  sectionBottom: number,
  variant: ExportVariant
) {
  if (building.height <= 0 || building.heightMm <= 0) {
    return ""
  }

  const x = round(building.x)
  const width = round(building.width)
  const baseY = round(sectionBottom)
  const topY = round(baseY - building.heightMm)
  const setbackHeight = clampNumber(round(building.heightMm * 0.12), 4, 12)
  const podiumHeight = clampNumber(round(building.heightMm * 0.08), 2.4, 7)
  const setbackWidth = round(width * 0.56)
  const setbackX = round(x + (width - setbackWidth) / 2)
  const bodyY = round(topY + setbackHeight)
  const bodyHeight = round(baseY - bodyY)
  const facadeFill = variant === "clean" ? "#dfe7ef" : svgPalette.building
  const accentFill = variant === "clean" ? "#eef3f8" : svgPalette.buildingAccent
  const stroke = variant === "clean" ? "#7d90a5" : "#17273b"
  const windowsMarkup =
    variant === "clean"
      ? ""
      : renderBuildingWindows(
          x,
          bodyY + 3,
          width,
          Math.max(bodyHeight - podiumHeight - 6, 10)
        )

  return `<g data-building-side="${building.side}">
    <rect x="${x}" y="${round(baseY - podiumHeight)}" width="${width}" height="${podiumHeight}" fill="${accentFill}" stroke="${stroke}" stroke-width="0.55" />
    <rect x="${x}" y="${bodyY}" width="${width}" height="${bodyHeight - podiumHeight}" fill="${facadeFill}" stroke="${stroke}" stroke-width="0.7" />
    <rect x="${setbackX}" y="${topY}" width="${setbackWidth}" height="${setbackHeight + 1.4}" fill="${accentFill}" stroke="${stroke}" stroke-width="0.65" />
    <line x1="${x}" y1="${baseY}" x2="${x + width}" y2="${baseY}" stroke="${stroke}" stroke-width="0.7" />
    ${windowsMarkup}
  </g>`
}

function renderBuildingWindows(
  x: number,
  y: number,
  width: number,
  height: number
) {
  const columns = Math.max(2, Math.floor(width / 6))
  const rows = Math.max(3, Math.floor(height / 8))
  const windowWidth = round(Math.max(1.2, Math.min(2.6, width / (columns * 1.75))))
  const windowHeight = round(Math.max(1.4, Math.min(3.2, height / (rows * 1.9))))
  const gapX = round((width - columns * windowWidth) / (columns + 1))
  const gapY = round((height - rows * windowHeight) / (rows + 1))
  const windows: string[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const windowX = round(x + gapX + column * (windowWidth + gapX))
      const windowY = round(y + gapY + row * (windowHeight + gapY))
      windows.push(
        `<rect x="${windowX}" y="${windowY}" width="${windowWidth}" height="${windowHeight}" rx="0.35" fill="${svgPalette.buildingWindow}" opacity="0.78" />`
      )
    }
  }

  return windows.join("")
}

function renderTreeIllustration(
  illustration: (typeof treeIllustrations)[number],
  x: number,
  y: number,
  width: number,
  height: number
) {
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" viewBox="${illustration.cropX} ${illustration.cropY} ${illustration.cropWidth} ${illustration.cropHeight}" preserveAspectRatio="xMidYMax meet" overflow="visible">
    <image href="${illustration.href}" width="${illustration.sourceWidth}" height="${illustration.sourceHeight}" filter="url(#tree-ink)" preserveAspectRatio="xMidYMid meet" />
  </svg>`
}

function renderSegmentAnnotations(
  layouts: SegmentLayout[],
  guideY: number,
  iconY: number,
  labelY: number
) {
  const guideMarkup = `<path d="M12 ${guideY} H${round(
    layouts.length > 0
      ? layouts[layouts.length - 1].x + layouts[layouts.length - 1].width + 12
      : 248
  )}" stroke="${svgPalette.guide}" stroke-width="0.6" />`

  const itemsMarkup = layouts
    .map((segment) => renderSegmentAnnotation(segment, iconY, labelY))
    .join("")

  return `${guideMarkup}${itemsMarkup}`
}

function renderSegmentAnnotation(
  segment: SegmentLayout,
  iconY: number,
  labelY: number
) {
  const definition = elementDefinitions[segment.element.type]
  const centerX = round(segment.x + segment.width / 2)
  const label =
    segment.width < 18 ? definition.shortLabel.toUpperCase() : definition.label
  const treeNote =
    segment.element.type === "treeStrip" && segment.element.treeHeight !== undefined
      ? `h ${formatMeters(segment.element.treeHeight)}`
      : ""

  return `<g data-annotation-index="${segment.sourceIndex + 1}">
    <line x1="${centerX}" y1="${round(iconY - 8)}" x2="${centerX}" y2="${round(iconY - 2.4)}" stroke="${svgPalette.guide}" stroke-width="0.55" />
    ${renderLegendIcon(segment, centerX, iconY)}
    <text x="${centerX}" y="${labelY}" text-anchor="middle" font-family="${svgSans}" font-size="3.5" font-weight="700" fill="${svgPalette.frame}">
      ${escapeXml(label)}
    </text>
    ${
      treeNote
        ? `<text x="${centerX}" y="${round(
            labelY + 5
          )}" text-anchor="middle" font-family="${svgSans}" font-size="3.1" fill="${svgPalette.inkSoft}">${escapeXml(
            treeNote
          )}</text>`
        : ""
    }
  </g>`
}

function renderLegendIcon(segment: SegmentLayout, centerX: number, centerY: number) {
  switch (segment.element.type) {
    case "lane":
      return `<line x1="${round(centerX - 7)}" y1="${centerY}" x2="${round(
        centerX + 7
      )}" y2="${centerY}" stroke="${svgPalette.frame}" stroke-width="1.05" stroke-dasharray="4 2.8" />`
    case "cycleway":
      return renderBikeIcon(centerX, centerY - 2, svgPalette.frame, 1, 0.9)
    case "sidewalk":
      return `<g stroke="${svgPalette.frame}" stroke-width="0.8">
        <line x1="${round(centerX - 4)}" y1="${round(centerY - 4)}" x2="${round(
        centerX - 4
      )}" y2="${round(centerY + 4)}" />
        <line x1="${centerX}" y1="${round(centerY - 4)}" x2="${centerX}" y2="${round(
        centerY + 4
      )}" />
        <line x1="${round(centerX + 4)}" y1="${round(centerY - 4)}" x2="${round(
        centerX + 4
      )}" y2="${round(centerY + 4)}" />
      </g>`
    case "treeStrip": {
      const illustration =
        treeIllustrations[segment.sourceIndex % treeIllustrations.length]
      const targetHeight = 11
      const targetWidth = round((illustration.cropWidth / illustration.cropHeight) * targetHeight)

      return renderTreeIllustration(
        illustration,
        centerX - targetWidth / 2,
        centerY - 7.5,
        targetWidth,
        targetHeight
      )
    }
    case "plantedBed":
      return renderImportedIcon(
        urbanIconSymbols.plantedBed,
        centerX,
        centerY + 1,
        11,
        svgPalette.frame
      )
    case "lawn":
      return `<path d="M${round(centerX - 4)} ${round(centerY + 4)} l1.6 -5 l1.6 5 l1.4 -4.1 l1.4 4.1 l1.6 -5 l1.7 5" fill="none" stroke="${svgPalette.frame}" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" />`
    case "bioswale":
      return `<path d="M${round(centerX - 8)} ${round(centerY + 2)} C${round(
        centerX - 3
      )} ${round(centerY - 4)}, ${round(centerX + 1)} ${round(
        centerY + 5
      )}, ${round(centerX + 8)} ${round(
        centerY - 1
      )}" fill="none" stroke="${svgPalette.frame}" stroke-width="1.05" stroke-linecap="round" />`
    case "streetFurniture":
      return renderImportedIcon(
        urbanIconSymbols.streetFurniture,
        centerX,
        centerY + 2,
        10,
        svgPalette.frame
      )
    case "parking":
      return `<text x="${centerX}" y="${round(
        centerY + 2
      )}" text-anchor="middle" font-family="${svgSans}" font-size="5.6" font-weight="700" fill="${svgPalette.frame}">P</text>`
    case "median":
      return `<path d="M${round(centerX - 5)} ${round(centerY - 4)} l4 6 l-4 6 M${round(
        centerX + 1
      )} ${round(centerY - 4)} l4 6 l-4 6" fill="none" stroke="${svgPalette.frame}" stroke-width="0.9" />`
    default:
      return ""
  }
}

function renderBikeIcon(
  centerX: number,
  centerY: number,
  stroke = svgPalette.frame,
  scale = 1,
  opacity = 1
) {
  return `<g transform="translate(${centerX} ${centerY}) scale(${scale})" stroke="${stroke}" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">
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
  fill: string
) {
  const scale = round(targetHeight / symbol.height)
  const width = round(symbol.width * scale)
  const height = round(symbol.height * scale)
  const x = round(centerX - width / 2)
  const y = round(centerY - height / 2)

  return `<g data-icon-source="${escapeXml(
    symbol.name
  )}" transform="translate(${x} ${y}) scale(${scale} ${scale})">
    <path d="${symbol.path}" fill="${fill}" opacity="0.92" />
  </g>`
}

function renderSectionFrame(
  drawingX: number,
  totalWidthMm: number,
  sectionY: number,
  sectionBottom: number
) {
  const endX = round(drawingX + totalWidthMm)
  const topY = round(sectionY)
  const bottomY = round(sectionBottom)

  return `<g>
    <line x1="${drawingX}" y1="${topY}" x2="${endX}" y2="${topY}" stroke="${svgPalette.frame}" stroke-width="0.9" />
    <line x1="${drawingX}" y1="${bottomY}" x2="${endX}" y2="${bottomY}" stroke="${svgPalette.frame}" stroke-width="0.9" />
    <line x1="${drawingX}" y1="${round(topY - 2.4)}" x2="${drawingX}" y2="${round(
    bottomY + 2.4
  )}" stroke="${svgPalette.frame}" stroke-width="0.7" />
    <line x1="${endX}" y1="${round(topY - 2.4)}" x2="${endX}" y2="${round(
    bottomY + 2.4
  )}" stroke="${svgPalette.frame}" stroke-width="0.7" />
  </g>`
}

function renderDimensionLine(
  x1: number,
  x2: number,
  sourceY: number,
  dimensionY: number,
  label: string
) {
  const safeLabel = escapeXml(label)
  const centerX = round((x1 + x2) / 2)

  return `<g>
    <line x1="${round(x1)}" y1="${round(sourceY)}" x2="${round(x1)}" y2="${round(
    dimensionY
  )}" stroke="${svgPalette.guide}" stroke-width="0.7" />
    <line x1="${round(x2)}" y1="${round(sourceY)}" x2="${round(x2)}" y2="${round(
    dimensionY
  )}" stroke="${svgPalette.guide}" stroke-width="0.7" />
    <line x1="${round(x1 + 1.8)}" y1="${round(
    dimensionY
  )}" x2="${round(x2 - 1.8)}" y2="${round(
    dimensionY
  )}" stroke="${svgPalette.dimension}" stroke-width="0.9" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
    <text x="${centerX}" y="${round(
    dimensionY - 2.8
  )}" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="${svgPalette.inkSoft}">${safeLabel}</text>
  </g>`
}

function renderVerticalDimensionLine(
  x: number,
  y1: number,
  y2: number,
  label: string
) {
  const safeLabel = escapeXml(label)
  const centerY = round((y1 + y2) / 2)
  const labelX = round(x + 6)

  return `<g>
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${svgPalette.dimension}" stroke-width="0.9" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)" />
    <line x1="${x - 2.8}" y1="${y1}" x2="${x + 2.8}" y2="${y1}" stroke="${svgPalette.guide}" stroke-width="0.7" />
    <line x1="${x - 2.8}" y1="${y2}" x2="${x + 2.8}" y2="${y2}" stroke="${svgPalette.guide}" stroke-width="0.7" />
    <text x="${labelX}" y="${centerY}" transform="rotate(-90 ${labelX} ${centerY})" text-anchor="middle" font-family="${svgSans}" font-size="3.8" fill="${svgPalette.inkSoft}">${safeLabel}</text>
  </g>`
}

function renderLayer(id: string, label: string, content: string) {
  return `<g id="layer-${id}" data-layer="${escapeXml(
    label
  )}" inkscape:groupmode="layer" inkscape:label="${escapeXml(label)}">
    ${content}
  </g>`
}

function getBuildingDimensionX(building: BuildingContext, gap: number) {
  return building.side === "left"
    ? round(building.x + building.width + gap / 2)
    : round(building.x - gap / 2)
}

function getTreeHeightMeters(element: SectionElement) {
  return (
    element.treeHeight ?? elementDefinitions.treeStrip.treeHeightControl?.defaultValue ?? 12
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
    : value.toFixed(1).replace(/\.0$/, "")

  return `${normalizedValue.replace(".", ",")} m`
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function round(value: number) {
  return Number(value.toFixed(2))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getExportFill(fill: string, variant: ExportVariant) {
  return mixHex(fill, svgPalette.paper, variant === "clean" ? 0.36 : 0.18)
}

function getExportStroke(stroke: string, variant: ExportVariant) {
  return mixHex(stroke, svgPalette.frame, variant === "clean" ? 0.2 : 0.08)
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
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`
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
