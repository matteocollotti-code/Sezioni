import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { Download, RotateCcw } from "lucide-react"

import {
  calculateMetrics,
  clampTreeHeight,
  clampWidth,
  createSectionElement,
  elementDefinitions,
  getDefaultTreeHeight,
  paletteOrder,
  scalePresets,
  sectionPresets,
} from "./data/sectionLibrary"
import type {
  ElementType,
  ExportVariant,
  SectionElement,
  SectionPreset,
} from "./types"
import { buildDownloadName, generateRoadSectionSvg } from "./utils/sectionSvg"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  SectionSummaryCard,
  type SectionSummaryItem,
} from "@/components/ui/section-summary-card"
import { MetricPanel, MiniMetric } from "./components/section-editor/EditorMetrics"
import { DimensionRangeField } from "./components/section-editor/DimensionRangeField"
import { formatDrawingMm, formatMeters } from "./components/section-editor/editorHelpers"
import { InteractiveSectionStrip } from "./components/section-editor/InteractiveSectionStrip"
import { SelectionInspector } from "./components/section-editor/SelectionInspector"

const defaultPreset = sectionPresets[0]
const defaultBuildingHeight = 18
const defaultStreetLength = 120

function buildPresetElements(preset: SectionPreset) {
  return preset.elements.map((item) =>
    createSectionElement(item.type, item.width, item.treeHeight)
  )
}

function clampBuildingHeight(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : defaultBuildingHeight
  return Number(Math.max(0, normalizedValue).toFixed(1))
}

function clampStreetLength(value: number) {
  const normalizedValue = Number.isFinite(value) ? value : defaultStreetLength
  return Number(Math.max(1, normalizedValue).toFixed(1))
}

function formatSquareMeters(value: number) {
  const normalized = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, "")

  return `${normalized.replace(".", ",")} mq`
}

function App() {
  const [projectTitle, setProjectTitle] = useState("Sezione urbana alberata")
  const [scale, setScale] = useState(100)
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id)
  const [previewVariant, setPreviewVariant] =
    useState<ExportVariant>("illustrated")
  const [isSummaryVisible, setIsSummaryVisible] = useState(false)
  const [elements, setElements] = useState<SectionElement[]>(() =>
    buildPresetElements(defaultPreset)
  )
  const [activeElementId, setActiveElementId] = useState<string | null>(null)
  const [summaryMode, setSummaryMode] = useState<"width" | "area">("width")
  const [streetLength, setStreetLength] = useState(defaultStreetLength)
  const [leftBuildingHeight, setLeftBuildingHeight] = useState(defaultBuildingHeight)
  const [rightBuildingHeight, setRightBuildingHeight] = useState(defaultBuildingHeight)

  const resolvedActiveElementId =
    activeElementId && elements.some((element) => element.id === activeElementId)
      ? activeElementId
      : elements[0]?.id ?? null

  const activeIndex = elements.findIndex(
    (element) => element.id === resolvedActiveElementId
  )
  const activeElement = activeIndex >= 0 ? elements[activeIndex] : null
  const metrics = calculateMetrics(elements)
  const exportModel = useMemo(
    () => ({
      projectTitle,
      scale,
      elements,
      leftBuildingHeight,
      rightBuildingHeight,
    }),
    [elements, leftBuildingHeight, projectTitle, rightBuildingHeight, scale]
  )
  const deferredModel = useDeferredValue(exportModel)
  const svgMarkup = useMemo(
    () => generateRoadSectionSvg(deferredModel, previewVariant),
    [deferredModel, previewVariant]
  )
  const isPreviewPending = deferredModel !== exportModel
  const usedTypes = Array.from(new Set(elements.map((element) => element.type)))
  const isSurfaceSummary = summaryMode === "area"
  const summaryTotalAmount = isSurfaceSummary
    ? Number((metrics.totalWidth * streetLength).toFixed(1))
    : metrics.totalWidth
  const summaryData: SectionSummaryItem[] = paletteOrder.flatMap((type) => {
    const matchingElements = elements.filter((element) => element.type === type)

    if (matchingElements.length === 0) {
      return []
    }

    const width = matchingElements.reduce((sum, element) => sum + element.width, 0)
    const amount = isSurfaceSummary ? width * streetLength : width
    const item: SectionSummaryItem = {
      category: elementDefinitions[type].label,
      percentage: metrics.totalWidth > 0 ? (width / metrics.totalWidth) * 100 : 0,
      amount: Number(amount.toFixed(1)),
      color: elementDefinitions[type].fill,
      count: matchingElements.length,
    }

    if (isSurfaceSummary) {
      item.detail = `${formatMeters(width)} x ${formatMeters(streetLength)}`
    }

    return [item]
  })

  const markAsCustom = () => setSelectedPresetId("custom")

  const applyPreset = (preset: SectionPreset) => {
    const nextElements = buildPresetElements(preset)

    startTransition(() => {
      setSelectedPresetId(preset.id)
      setProjectTitle(preset.name)
      setElements(nextElements)
      setActiveElementId(nextElements[0]?.id ?? null)
    })
  }

  const updateScale = (value: number) => {
    if (Number.isFinite(value)) {
      setScale(Math.min(500, Math.max(25, Math.round(value))))
    }
  }

  const updateElement = (
    id: string,
    updater: (element: SectionElement) => SectionElement
  ) => {
    setElements((current) =>
      current.map((element) => (element.id === id ? updater(element) : element))
    )
    markAsCustom()
  }

  const handleTypeChange = (id: string, nextType: ElementType) => {
    updateElement(id, (element) => ({
      ...element,
      type: nextType,
      width: clampWidth(nextType, element.width),
      treeHeight:
        nextType === "treeStrip"
          ? clampTreeHeight(
              nextType,
              element.treeHeight ?? getDefaultTreeHeight(nextType) ?? 12
            )
          : undefined,
    }))
  }

  const handleWidthChange = (id: string, value: number) => {
    updateElement(id, (element) => ({
      ...element,
      width: clampWidth(element.type, value),
    }))
  }

  const handleTreeHeightChange = (id: string, value: number) => {
    updateElement(id, (element) => ({
      ...element,
      treeHeight: clampTreeHeight(element.type, value),
    }))
  }

  const moveElement = (id: string, direction: -1 | 1) => {
    setElements((current) => {
      const currentIndex = current.findIndex((element) => element.id === id)
      const nextIndex = currentIndex + direction

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(nextIndex, 0, moved)
      return next
    })
    setActiveElementId(id)
    markAsCustom()
  }

  const reorderElement = (id: string, targetIndex: number) => {
    setElements((current) => {
      const currentIndex = current.findIndex((element) => element.id === id)

      if (
        currentIndex === -1 ||
        targetIndex < 0 ||
        targetIndex >= current.length ||
        targetIndex === currentIndex
      ) {
        return current
      }

      const next = [...current]
      const [moved] = next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setActiveElementId(id)
    markAsCustom()
  }

  const resizeElement = (id: string, value: number) => {
    updateElement(id, (element) => ({
      ...element,
      width: clampWidth(element.type, value),
    }))
    setActiveElementId(id)
  }

  const removeElement = (id: string) => {
    let nextActiveId: string | null = null

    setElements((current) => {
      const currentIndex = current.findIndex((element) => element.id === id)
      if (currentIndex === -1) {
        return current
      }

      const next = current.filter((element) => element.id !== id)
      nextActiveId = next[currentIndex]?.id ?? next[currentIndex - 1]?.id ?? null
      return next
    })

    setActiveElementId(nextActiveId)
    markAsCustom()
  }

  const addElement = (type: ElementType) => {
    const nextElement = createSectionElement(
      type,
      elementDefinitions[type].defaultWidth
    )

    setElements((current) => {
      const currentIndex = current.findIndex(
        (element) => element.id === resolvedActiveElementId
      )
      const insertIndex = currentIndex === -1 ? current.length : currentIndex + 1
      const next = [...current]
      next.splice(insertIndex, 0, nextElement)
      return next
    })

    setActiveElementId(nextElement.id)
    markAsCustom()
  }

  const resetCurrentPreset = () => {
    const fallbackPreset =
      sectionPresets.find((preset) => preset.id === selectedPresetId) ??
      defaultPreset
    applyPreset(fallbackPreset)
  }

  const downloadSvg = (variant: ExportVariant) => {
    const markup = generateRoadSectionSvg(exportModel, variant)
    const svgBlob = new Blob([markup], {
      type: "image/svg+xml;charset=utf-8",
    })
    const objectUrl = URL.createObjectURL(svgBlob)
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = `${buildDownloadName(projectTitle, variant)}.svg`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
      <header className="rounded-[32px] border border-border/70 bg-background/88 shadow-[0_24px_90px_rgba(24,34,33,0.08)] backdrop-blur">
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <Badge variant="secondary">Editor diretto</Badge>
              <div className="space-y-2">
                <h1 className="font-serif text-3xl leading-tight tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[3.2rem]">
                  Clicca la sezione e modifica ogni fascia in modo diretto.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Seleziona una fascia per aprire subito tipologia, larghezza e
                  altezza degli alberi. L&apos;SVG resta in scala e si aggiorna in
                  tempo reale mentre lavori.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricPanel label="larghezza totale" value={formatMeters(metrics.totalWidth)} />
              <MetricPanel label="verde" value={formatMeters(metrics.greenWidth)} />
              <MetricPanel label="tavola" value={formatDrawingMm(metrics.totalWidth, scale)} />
            </div>
          </div>

          <FieldGroup className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Field>
              <FieldLabel htmlFor="project-title">Titolo tavola</FieldLabel>
              <Input
                id="project-title"
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                placeholder="Sezione urbana"
              />
            </Field>
            <Field>
              <FieldLabel>Scala di esportazione</FieldLabel>
              <Select value={String(scale)} onValueChange={(value) => updateScale(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Scegli la scala" />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                  <SelectGroup>
                    {[25, 50, 100, 200, 500].map((scaleOption) => (
                      <SelectItem key={scaleOption} value={String(scaleOption)}>
                        1:{scaleOption}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>Le scale rapide restano qui sotto.</FieldDescription>
            </Field>
            <div className="flex items-end">
              <Button variant="outline" onClick={resetCurrentPreset}>
                <RotateCcw data-icon="inline-start" />
                Ripristina preset
              </Button>
            </div>
          </FieldGroup>

          <section className="rounded-[28px] border border-border/70 bg-primary/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Contesto laterale
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Imposta l&apos;altezza degli edifici ai due lati della tavola. Se porti un lato a 0 m, quel fronte scompare.
                  </p>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto">
                  profilo urbano
                </Badge>
              </div>

              <FieldGroup className="grid gap-4 lg:grid-cols-2">
                <DimensionRangeField
                  id="left-building-height"
                  label="Edificio sinistro"
                  value={leftBuildingHeight}
                  min={0}
                  max={leftBuildingHeight}
                  step={0.5}
                  unitLabel="m"
                  allowUnlimited
                  showTicks
                  onChange={(value) => setLeftBuildingHeight(clampBuildingHeight(value))}
                />
                <DimensionRangeField
                  id="right-building-height"
                  label="Edificio destro"
                  value={rightBuildingHeight}
                  min={0}
                  max={rightBuildingHeight}
                  step={0.5}
                  unitLabel="m"
                  allowUnlimited
                  showTicks
                  onChange={(value) => setRightBuildingHeight(clampBuildingHeight(value))}
                />
              </FieldGroup>
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Preset iniziali
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Parti da un profilo esistente oppure continua in modalita personalizzata.
                </p>
              </div>
              <Badge variant={selectedPresetId === "custom" ? "outline" : "secondary"}>
                {selectedPresetId === "custom" ? "personalizzata" : "preset"}
              </Badge>
            </div>
            <div className="grid gap-2 lg:grid-cols-3">
              {sectionPresets.map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPresetId === preset.id ? "default" : "outline"}
                  className="h-auto w-full justify-start px-3 py-3 text-left"
                  onClick={() => applyPreset(preset)}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-sm font-medium">{preset.name}</span>
                    <span
                      className={cn(
                        "text-xs leading-5",
                        selectedPresetId === preset.id
                          ? "text-primary-foreground/78"
                          : "text-muted-foreground"
                      )}
                    >
                      {preset.summary}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(scale)}
              onValueChange={(value) => value && updateScale(Number(value))}
              className="flex flex-wrap gap-2"
            >
              {scalePresets.map((scalePreset) => (
                <ToggleGroupItem key={scalePreset} value={String(scalePreset)}>
                  1:{scalePreset}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </header>

      <main className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <section className="overflow-hidden rounded-[32px] border border-border/70 bg-background/88 shadow-[0_18px_60px_rgba(22,38,62,0.08)]">
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">Sezione cliccabile</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  Clicca una fascia per aprire l&apos;editor. Le nuove fasce entrano dopo quella attiva.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MiniMetric label="mobilita attiva" value={formatMeters(metrics.activeMobilityWidth)} />
                <MiniMetric label="veicolare" value={formatMeters(metrics.vehicularWidth)} />
                <MiniMetric label="supporto" value={formatMeters(metrics.supportWidth)} />
              </div>
            </div>

            <InteractiveSectionStrip
              elements={elements}
              totalWidth={metrics.totalWidth}
              activeElementId={resolvedActiveElementId}
              onSelect={setActiveElementId}
              onResize={resizeElement}
              onReorder={reorderElement}
            />

            <Separator />

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {paletteOrder.map((type) => {
                const definition = elementDefinitions[type]
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto justify-start px-3 py-3 text-left"
                    onClick={() => addElement(type)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full ring-1 ring-foreground/10"
                        style={{ background: definition.fill }}
                      />
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-medium">{definition.label}</span>
                        <span className="text-xs text-muted-foreground">
                          + {formatMeters(definition.defaultWidth)}
                        </span>
                      </div>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>
        </section>

        <SelectionInspector
          elements={elements}
          activeElement={activeElement}
          activeIndex={activeIndex}
          onTypeChange={handleTypeChange}
          onWidthChange={handleWidthChange}
          onTreeHeightChange={handleTreeHeightChange}
          onMoveLeft={(id) => moveElement(id, -1)}
          onMoveRight={(id) => moveElement(id, 1)}
          onRemove={removeElement}
        />

        <section className="overflow-hidden rounded-[32px] border border-border/70 bg-background/88 shadow-[0_18px_60px_rgba(22,38,62,0.08)] xl:col-start-1">
          <div className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground">Anteprima SVG</h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  La tavola vettoriale resta sincronizzata con la sezione cliccabile e con il contesto urbano laterale.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:items-end">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={previewVariant}
                  onValueChange={(value) =>
                    (value === "illustrated" || value === "clean") &&
                    setPreviewVariant(value)
                  }
                  className="flex flex-wrap gap-2"
                >
                  <ToggleGroupItem value="illustrated">Illustrata</ToggleGroupItem>
                <ToggleGroupItem value="clean">Clean</ToggleGroupItem>
                </ToggleGroup>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={isSummaryVisible ? "secondary" : "outline"}
                    onClick={() => setIsSummaryVisible((current) => !current)}
                  >
                    {isSummaryVisible ? "Disegno" : "Summary"}
                  </Button>
                  <Button onClick={() => downloadSvg("illustrated")}>
                    <Download data-icon="inline-start" />
                    SVG illustrato
                  </Button>
                  <Button variant="outline" onClick={() => downloadSvg("clean")}>
                    <Download data-icon="inline-start" />
                    SVG clean
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isPreviewPending ? "outline" : "secondary"}>
                {isPreviewPending ? "aggiorno preview" : "preview pronta"}
              </Badge>
              <Badge variant="outline">1:{scale}</Badge>
              <Badge variant="outline">{elements.length} fasce</Badge>
              <Badge variant="outline">
                sx {formatMeters(leftBuildingHeight)} | dx {formatMeters(rightBuildingHeight)}
              </Badge>
              {isSummaryVisible && isSurfaceSummary ? (
                <Badge variant="outline">lunghezza {formatMeters(streetLength)}</Badge>
              ) : null}
              {isSummaryVisible ? <Badge variant="outline">summary</Badge> : null}
            </div>

            {isSummaryVisible ? (
              <div className="flex flex-col gap-4">
                <section className="rounded-[28px] border border-border/70 bg-primary/5 p-4 sm:p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          Modalita summary
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          Passa da larghezze a superfici. In modalita superfici il riepilogo calcola i mq di ogni componente sulla lunghezza che inserisci.
                        </p>
                      </div>
                      <ToggleGroup
                        type="single"
                        variant="outline"
                        size="sm"
                        value={summaryMode}
                        onValueChange={(value) =>
                          (value === "width" || value === "area") &&
                          setSummaryMode(value)
                        }
                        className="flex flex-wrap gap-2"
                      >
                        <ToggleGroupItem value="width">Larghezze</ToggleGroupItem>
                        <ToggleGroupItem value="area">Superfici</ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {isSurfaceSummary ? (
                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                        <DimensionRangeField
                          id="street-length"
                          label="Lunghezza strada"
                          value={streetLength}
                          min={1}
                          max={streetLength}
                          step={1}
                          unitLabel="m"
                          allowUnlimited
                          showTicks
                          description="Il calcolo usa la larghezza complessiva di ogni categoria moltiplicata per la lunghezza della strada."
                          onChange={(value) => setStreetLength(clampStreetLength(value))}
                        />

                        <div className="rounded-[24px] border border-border/70 bg-background/88 p-4 shadow-sm">
                          <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Superficie totale
                          </div>
                          <div className="mt-2 text-2xl font-semibold text-foreground">
                            {formatSquareMeters(summaryTotalAmount)}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {formatMeters(metrics.totalWidth)} x {formatMeters(streetLength)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-border/70 bg-background/88 px-4 py-3 text-sm leading-6 text-muted-foreground">
                        Il riepilogo mostra le larghezze aggregate di ogni categoria presenti nella sezione.
                      </div>
                    )}
                  </div>
                </section>

                <SectionSummaryCard
                  title={isSurfaceSummary ? "Summary superfici" : "Summary dimensionale"}
                  dateRange={
                    isSurfaceSummary
                      ? `${projectTitle} | lunghezza ${formatMeters(streetLength)} | scala 1:${scale}`
                      : `${projectTitle} | scala 1:${scale}`
                  }
                  data={summaryData}
                  totalLabel={isSurfaceSummary ? "Superficie totale" : "Totale sezione"}
                  unit={isSurfaceSummary ? "mq" : "m"}
                  buttonText="Torna al disegno"
                  onButtonClick={() => setIsSummaryVisible(false)}
                />
              </div>
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(236,242,249,0.98))] p-3 shadow-inner sm:p-4">
                <div
                  className="overflow-hidden rounded-[22px] border border-border/60 bg-white"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {usedTypes.map((type) => {
                const definition = elementDefinitions[type]
                return (
                  <Badge key={type} variant="outline" className="gap-2">
                    <span
                      className="size-2.5 rounded-full ring-1 ring-foreground/10"
                      style={{ background: definition.fill }}
                    />
                    {definition.label}
                  </Badge>
                )
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
