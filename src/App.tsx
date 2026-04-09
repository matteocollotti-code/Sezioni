import {
  startTransition,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { Download, RotateCcw, Sparkles } from "lucide-react"

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
} from "./types"
import { buildDownloadName, generateRoadSectionSvg } from "./utils/sectionSvg"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/interfaces-switch"
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
import { OrbitalLoader } from "@/components/ui/orbital-loader"
import { MetricPanel, MiniMetric } from "./components/section-editor/EditorMetrics"
import { DimensionRangeField } from "./components/section-editor/DimensionRangeField"
import { formatDrawingMm, formatMeters } from "./components/section-editor/editorHelpers"
import { InteractiveSectionStrip } from "./components/section-editor/InteractiveSectionStrip"
import { SelectionInspector } from "./components/section-editor/SelectionInspector"

const defaultPreset = sectionPresets[0]
const defaultStreetLength = 120

function buildDefaultElements() {
  return defaultPreset.elements.map((item) =>
    createSectionElement(item.type, item.width, item.treeHeight)
  )
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

interface AiIllustrationResult {
  imageDataUrl: string
  revisedPrompt?: string | null
  sourceKey: string
}

function App() {
  const [projectTitle, setProjectTitle] = useState("Sezione urbana alberata")
  const [scale, setScale] = useState(100)
  const [previewVariant, setPreviewVariant] =
    useState<ExportVariant>("illustrated")
  const [previewPanel, setPreviewPanel] = useState<"drawing" | "summary">(
    "drawing"
  )
  const [elements, setElements] = useState<SectionElement[]>(() =>
    buildDefaultElements()
  )
  const [aiIllustration, setAiIllustration] = useState<AiIllustrationResult | null>(
    null
  )
  const [isGeneratingAiIllustration, setIsGeneratingAiIllustration] =
    useState(false)
  const [aiIllustrationError, setAiIllustrationError] = useState<string | null>(
    null
  )
  const [activeElementId, setActiveElementId] = useState<string | null>(null)
  const [summaryMode, setSummaryMode] = useState<"width" | "area">("width")
  const [streetLength, setStreetLength] = useState(defaultStreetLength)

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
    }),
    [elements, projectTitle, scale]
  )
  const deferredModel = useDeferredValue(exportModel)
  const svgMarkup = useMemo(
    () => generateRoadSectionSvg(deferredModel, previewVariant),
    [deferredModel, previewVariant]
  )
  const isPreviewPending = deferredModel !== exportModel
  const usedTypes = Array.from(new Set(elements.map((element) => element.type)))
  const isSurfaceSummary = summaryMode === "area"
  const isSummaryVisible = previewPanel === "summary"
  const currentIllustrationSourceKey = useMemo(
    () =>
      JSON.stringify({
        projectTitle,
        scale,
        elements: elements.map((element) => ({
          type: element.type,
          width: Number(element.width.toFixed(2)),
          treeHeight:
            typeof element.treeHeight === "number"
              ? Number(element.treeHeight.toFixed(2))
              : null,
        })),
      }),
    [elements, projectTitle, scale]
  )
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
  const isAiIllustrationStale =
    aiIllustration !== null && aiIllustration.sourceKey !== currentIllustrationSourceKey
  const previewVariantLabel =
    previewVariant === "illustrated" ? "illustrata" : "clean"
  const svgDownloadLabel = "Scarica SVG clean"

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
  }

  const resetSection = () => {
    const nextElements = buildDefaultElements()

    startTransition(() => {
      setProjectTitle(defaultPreset.name)
      setElements(nextElements)
      setActiveElementId(nextElements[0]?.id ?? null)
    })
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

  const downloadAiIllustration = () => {
    if (!aiIllustration) {
      return
    }

    const anchor = document.createElement("a")
    anchor.href = aiIllustration.imageDataUrl
    anchor.download = `${buildDownloadName(projectTitle, "illustrated")}-ai.png`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
  }

  const generateAiIllustration = async () => {
    setIsGeneratingAiIllustration(true)
    setAiIllustrationError(null)

    try {
      const response = await fetch("/api/generate-illustration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectTitle,
          scale,
          totalWidth: metrics.totalWidth,
          elements,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        imageDataUrl?: string
        revisedPrompt?: string | null
      }

      if (!response.ok || !payload.imageDataUrl) {
        throw new Error(
          payload.error ??
            "La generazione AI non è riuscita. Controlla la chiave OpenAI e riprova."
        )
      }

      setAiIllustration({
        imageDataUrl: payload.imageDataUrl,
        revisedPrompt: payload.revisedPrompt ?? null,
        sourceKey: currentIllustrationSourceKey,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "La generazione AI non è riuscita."
      setAiIllustrationError(message)
    } finally {
      setIsGeneratingAiIllustration(false)
    }
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
              <Button variant="outline" onClick={resetSection}>
                <RotateCcw data-icon="inline-start" />
                Ripristina sezione
              </Button>
            </div>
          </FieldGroup>

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
                  La tavola vettoriale resta sincronizzata con la sezione cliccabile.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:items-end">
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={previewPanel}
                  onValueChange={(value) =>
                    (value === "drawing" || value === "summary") &&
                    setPreviewPanel(value)
                  }
                  className="flex flex-wrap gap-2"
                >
                  <ToggleGroupItem value="drawing">Disegno</ToggleGroupItem>
                  <ToggleGroupItem value="summary">Summary</ToggleGroupItem>
                </ToggleGroup>
                <Button
                  variant="outline"
                  className="bg-white/90 text-foreground shadow-sm hover:bg-white"
                  onClick={() => downloadSvg("clean")}
                >
                  <Download data-icon="inline-start" />
                  {svgDownloadLabel}
                </Button>
              </div>
            </div>

            {!isSummaryVisible ? (
              <div className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    Variante disegno
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    `Clean` mostra l'SVG tecnico. `Illustrata` genera un render AI on demand.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-full border border-border/70 bg-background/88 px-3 py-2 shadow-sm">
                  <span
                    className={
                      previewVariant === "clean"
                        ? "text-sm font-semibold text-foreground"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    Clean
                  </span>
                  <Switch
                    checked={previewVariant === "illustrated"}
                    onCheckedChange={(checked) =>
                      setPreviewVariant(checked ? "illustrated" : "clean")
                    }
                    aria-label="Passa da Clean a Illustrata"
                  />
                  <span
                    className={
                      previewVariant === "illustrated"
                        ? "text-sm font-semibold text-foreground"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    Illustrata
                  </span>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isPreviewPending ? "outline" : "secondary"}>
                {isPreviewPending ? "aggiorno preview" : "preview pronta"}
              </Badge>
              <Badge variant="outline">1:{scale}</Badge>
              <Badge variant="outline">{elements.length} fasce</Badge>
              <Badge variant="outline">
                {isSummaryVisible ? "summary" : `disegno ${previewVariantLabel}`}
              </Badge>
              {!isSummaryVisible && previewVariant === "illustrated" ? (
                <Badge variant="outline">
                  {aiIllustration
                    ? isAiIllustrationStale
                      ? "illustrazione da aggiornare"
                      : "illustrazione AI pronta"
                    : "illustrazione AI"}
                </Badge>
              ) : null}
              {isSummaryVisible && isSurfaceSummary ? (
                <Badge variant="outline">lunghezza {formatMeters(streetLength)}</Badge>
              ) : null}
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
                />
              </div>
            ) : previewVariant === "illustrated" ? (
              <div className="flex flex-col gap-4 rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(236,242,249,0.98))] p-4 shadow-inner sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                      Render AI
                    </div>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Genera una versione illustrata con OpenAI a partire dalla sezione corrente. Lo `SVG clean` resta l'output tecnico da scaricare.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={generateAiIllustration} disabled={isGeneratingAiIllustration}>
                      <Sparkles data-icon="inline-start" />
                      {aiIllustration ? "Rigenera immagine AI" : "Genera illustrata AI"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadAiIllustration}
                      disabled={!aiIllustration}
                    >
                      <Download data-icon="inline-start" />
                      Scarica PNG AI
                    </Button>
                  </div>
                </div>

                {aiIllustrationError ? (
                  <div className="rounded-[22px] border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
                    {aiIllustrationError}
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-[24px] border border-border/60 bg-white">
                  {isGeneratingAiIllustration ? (
                    <div className="flex min-h-[420px] items-center justify-center px-6 py-12">
                      <OrbitalLoader
                        className="h-20 w-20 text-foreground"
                        message="Genero l'illustrazione AI"
                      />
                    </div>
                  ) : aiIllustration ? (
                    <img
                      src={aiIllustration.imageDataUrl}
                      alt={`Render AI della sezione ${projectTitle}`}
                      className="block w-full bg-white object-contain"
                    />
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                      <div className="rounded-full border border-border/70 bg-primary/5 p-3 text-primary">
                        <Sparkles className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-medium text-foreground">
                          Nessuna illustrazione AI generata
                        </p>
                        <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                          Clicca il pulsante per creare una tavola illustrata più atmosferica, mantenendo il disegno tecnico separato nella variante clean.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {aiIllustration?.revisedPrompt ? (
                  <div className="rounded-[22px] border border-border/70 bg-background/88 px-4 py-3 text-xs leading-6 text-muted-foreground">
                    Prompt AI ottimizzato: {aiIllustration.revisedPrompt}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="select-none overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(250,252,255,0.96),rgba(236,242,249,0.98))] p-2 shadow-inner sm:p-2.5">
                <div
                  className="overflow-hidden rounded-[22px] border border-border/60 bg-white select-none"
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
