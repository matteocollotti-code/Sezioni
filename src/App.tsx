import { startTransition, useDeferredValue, useMemo, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Download,
  RotateCcw,
  Trash2,
} from "lucide-react"

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
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const defaultPreset = sectionPresets[0]

function App() {
  const [projectTitle, setProjectTitle] = useState("Sezione urbana alberata")
  const [scale, setScale] = useState(100)
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id)
  const [previewVariant, setPreviewVariant] =
    useState<ExportVariant>("illustrated")
  const [elements, setElements] = useState(() =>
    defaultPreset.elements.map((item) =>
      createSectionElement(item.type, item.width, item.treeHeight)
    )
  )

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

  const applyPreset = (preset: SectionPreset) => {
    startTransition(() => {
      setSelectedPresetId(preset.id)
      setProjectTitle(preset.name)
      setElements(
        preset.elements.map((item) =>
          createSectionElement(item.type, item.width, item.treeHeight)
        )
      )
    })
  }

  const markAsCustom = () => {
    setSelectedPresetId("custom")
  }

  const updateScale = (value: number) => {
    if (!Number.isFinite(value)) {
      return
    }

    setScale(Math.min(500, Math.max(25, Math.round(value))))
  }

  const updateElement = (
    id: string,
    updater: (element: SectionElement) => SectionElement
  ) => {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === id ? updater(element) : element
      )
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

  const handleWidthChange = (id: string, rawValue: string) => {
    const parsedValue = Number.parseFloat(rawValue)

    if (!Number.isFinite(parsedValue)) {
      return
    }

    updateElement(id, (element) => ({
      ...element,
      width: clampWidth(element.type, parsedValue),
    }))
  }

  const handleTreeHeightChange = (id: string, rawValue: string) => {
    const parsedValue = Number.parseFloat(rawValue)

    if (!Number.isFinite(parsedValue)) {
      return
    }

    updateElement(id, (element) => ({
      ...element,
      treeHeight: clampTreeHeight(element.type, parsedValue),
    }))
  }

  const moveElement = (id: string, direction: -1 | 1) => {
    setElements((currentElements) => {
      const currentIndex = currentElements.findIndex((element) => element.id === id)

      if (currentIndex === -1) {
        return currentElements
      }

      const nextIndex = currentIndex + direction

      if (nextIndex < 0 || nextIndex >= currentElements.length) {
        return currentElements
      }

      const nextElements = [...currentElements]
      const [movedElement] = nextElements.splice(currentIndex, 1)
      nextElements.splice(nextIndex, 0, movedElement)
      return nextElements
    })
    markAsCustom()
  }

  const removeElement = (id: string) => {
    setElements((currentElements) =>
      currentElements.filter((element) => element.id !== id)
    )
    markAsCustom()
  }

  const addElement = (type: ElementType) => {
    setElements((currentElements) => [
      ...currentElements,
      createSectionElement(type, elementDefinitions[type].defaultWidth),
    ])
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
    <div className="mx-auto flex min-h-screen max-w-[1560px] flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
      <header className="overflow-hidden rounded-[28px] border border-border/70 bg-card/90 shadow-[0_28px_90px_rgba(25,39,37,0.08)] backdrop-blur">
        <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.15fr)_360px] lg:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Studio sezione</Badge>
              <Badge variant="secondary">SVG quotato 1:{scale}</Badge>
              <Badge variant="secondary">{elements.length} fasce attive</Badge>
            </div>

            <div className="max-w-4xl space-y-3">
              <h1 className="font-serif text-4xl leading-none tracking-[-0.05em] text-foreground sm:text-5xl">
                Sezioni stradali vettoriali, piu pulite e piu rapide da
                configurare.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Imposta larghezze, filari, ciclabili, verde e arredo urbano da
                un workspace compatto. L&apos;export resta in scala e scaricabile
                sia in versione illustrata sia clean.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricPanel
                label="larghezza totale"
                value={formatMeters(metrics.totalWidth)}
              />
              <MetricPanel
                label="verde"
                value={formatMeters(metrics.greenWidth)}
              />
              <MetricPanel
                label="tavola"
                value={formatDrawingMm(metrics.totalWidth, scale)}
              />
            </div>

            <SectionBandPreview elements={elements} />
          </div>

          <Card className="border border-border/70 bg-background/85 shadow-none">
            <CardHeader>
              <CardTitle>Impostazioni rapide</CardTitle>
              <CardDescription>
                Titolo, scala e variante di output senza uscire dal flusso.
              </CardDescription>
              <CardAction>
                <Badge
                  variant={
                    selectedPresetId === "custom" ? "outline" : "secondary"
                  }
                >
                  {selectedPresetId === "custom" ? "personalizzata" : "preset"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FieldGroup>
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
                  <Select
                    value={String(scale)}
                    onValueChange={(value) => updateScale(Number(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Scegli la scala" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className="w-[var(--radix-select-trigger-width)]"
                    >
                      <SelectGroup>
                        {[25, 50, 100, 200, 500].map((scaleOption) => (
                          <SelectItem key={scaleOption} value={String(scaleOption)}>
                            1:{scaleOption}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Le scale consigliate restano a portata di clic qui sotto.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Scale rapide
                </span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={String(scale)}
                  onValueChange={(value) => {
                    if (value) {
                      updateScale(Number(value))
                    }
                  }}
                  className="flex flex-wrap gap-2"
                >
                  {scalePresets.map((scalePreset) => (
                    <ToggleGroupItem key={scalePreset} value={String(scalePreset)}>
                      1:{scalePreset}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                  Anteprima
                </span>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={previewVariant}
                  onValueChange={(value) => {
                    if (value === "illustrated" || value === "clean") {
                      setPreviewVariant(value)
                    }
                  }}
                  className="flex flex-wrap gap-2"
                >
                  <ToggleGroupItem value="illustrated">
                    Illustrata
                  </ToggleGroupItem>
                  <ToggleGroupItem value="clean">Clean</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="outline" onClick={resetCurrentPreset}>
                <RotateCcw data-icon="inline-start" />
                Ripristina
              </Button>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => downloadSvg("illustrated")}>
                  <Download data-icon="inline-start" />
                  SVG illustrato
                </Button>
                <Button variant="outline" onClick={() => downloadSvg("clean")}>
                  <Download data-icon="inline-start" />
                  SVG clean
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </header>

      <main className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6 lg:sticky lg:top-4 lg:self-start">
          <Card className="border border-border/70 bg-card/90 shadow-[0_18px_60px_rgba(23,34,33,0.06)]">
            <CardHeader>
              <CardTitle>Preset iniziali</CardTitle>
              <CardDescription>
                Tre impianti di partenza per entrare subito nel merito del
                profilo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
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
            </CardContent>
          </Card>

          <Card className="border border-border/70 bg-card/90 shadow-[0_18px_60px_rgba(23,34,33,0.06)]">
            <CardHeader>
              <CardTitle>Aggiungi elementi</CardTitle>
              <CardDescription>
                Inserisci nuove fasce e continua a rifinire la sezione.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {paletteOrder.map((type) => {
                const definition = elementDefinitions[type]

                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto justify-start px-3 py-3 text-left"
                    onClick={() => addElement(type)}
                  >
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full ring-1 ring-foreground/10"
                          style={{ background: definition.fill }}
                        />
                        <span className="text-sm font-medium">
                          {definition.label}
                        </span>
                      </div>
                      <span className="text-xs leading-5 text-muted-foreground">
                        {definition.shortLabel.toUpperCase()}
                      </span>
                    </div>
                  </Button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="border border-border/70 bg-card/90 shadow-[0_18px_60px_rgba(23,34,33,0.06)]">
            <CardHeader>
              <CardTitle>Anteprima SVG</CardTitle>
              <CardDescription>
                La tavola si aggiorna in tempo reale mentre modifichi larghezze
                e altezze.
              </CardDescription>
              <CardAction>
                <Badge variant={isPreviewPending ? "outline" : "secondary"}>
                  {isPreviewPending ? "aggiorno" : "sincronizzata"}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid gap-3 md:grid-cols-4">
                <MetricPanel
                  label="totale"
                  value={formatMeters(metrics.totalWidth)}
                />
                <MetricPanel
                  label="verde"
                  value={formatMeters(metrics.greenWidth)}
                />
                <MetricPanel
                  label="mobilita attiva"
                  value={formatMeters(metrics.activeMobilityWidth)}
                />
                <MetricPanel
                  label="veicolare"
                  value={formatMeters(metrics.vehicularWidth)}
                />
              </div>

              <Separator />

              <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/95 p-3 shadow-inner sm:p-4">
                <div className="overflow-hidden rounded-[20px] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,240,233,0.96))]">
                  <div
                    className="p-4 sm:p-5"
                    dangerouslySetInnerHTML={{ __html: svgMarkup }}
                  />
                </div>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                La variante{" "}
                <span className="font-medium text-foreground">
                  {previewVariant === "clean" ? "clean" : "illustrata"}
                </span>{" "}
                {previewVariant === "clean"
                  ? "mantiene solo campiture, quote e misure per una postproduzione piu rapida."
                  : "usa simbologie vettoriali piu ricche, con alberi derivati da misto.ai e apparato grafico spostato piu in basso."}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center gap-2">
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
            </CardFooter>
          </Card>

          <Card className="border border-border/70 bg-card/90 shadow-[0_18px_60px_rgba(23,34,33,0.06)]">
            <CardHeader>
              <CardTitle>Elementi della sezione</CardTitle>
              <CardDescription>
                Gestisci ordine, tipologia, larghezza e altezza dei filari.
              </CardDescription>
              <CardAction>
                <Badge variant="secondary">{elements.length} elementi</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0 sm:px-4">
              <ScrollArea className="h-[min(72vh,960px)] px-4">
                <div className="flex flex-col gap-4 pb-4">
                  {elements.map((element, index) => (
                    <ElementEditorCard
                      key={element.id}
                      element={element}
                      index={index}
                      isFirst={index === 0}
                      isLast={index === elements.length - 1}
                      onTypeChange={(value) => handleTypeChange(element.id, value)}
                      onWidthChange={(value) =>
                        handleWidthChange(element.id, String(value))
                      }
                      onTreeHeightChange={(value) =>
                        handleTreeHeightChange(element.id, String(value))
                      }
                      onMoveLeft={() => moveElement(element.id, -1)}
                      onMoveRight={() => moveElement(element.id, 1)}
                      onRemove={() => removeElement(element.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

interface ElementEditorCardProps {
  element: SectionElement
  index: number
  isFirst: boolean
  isLast: boolean
  onTypeChange: (value: ElementType) => void
  onWidthChange: (value: number) => void
  onTreeHeightChange: (value: number) => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onRemove: () => void
}

function ElementEditorCard({
  element,
  index,
  isFirst,
  isLast,
  onTypeChange,
  onWidthChange,
  onTreeHeightChange,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: ElementEditorCardProps) {
  const definition = elementDefinitions[element.type]
  const treeHeightControl = definition.treeHeightControl

  return (
    <Card
      size="sm"
      className="border border-border/70 bg-background/85 shadow-[0_10px_24px_rgba(24,34,33,0.04)]"
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
              style={{ background: definition.fill }}
            />
            <div className="space-y-1">
              <CardTitle className="text-sm">
                Fascia {index + 1} · {definition.label}
              </CardTitle>
              <CardDescription className="text-xs leading-5">
                {definition.description}
              </CardDescription>
            </div>
          </div>

          <Badge variant="outline">
            {formatMeters(element.width)}
            {element.type === "treeStrip" && element.treeHeight !== undefined
              ? ` | h ${formatMeters(element.treeHeight)}`
              : ""}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <FieldGroup>
          <Field>
            <FieldLabel>Tipologia elemento</FieldLabel>
            <Select
              value={element.type}
              onValueChange={(value) => onTypeChange(value as ElementType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona elemento" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                className="w-[var(--radix-select-trigger-width)]"
              >
                <SelectGroup>
                  {paletteOrder.map((optionType) => (
                    <SelectItem key={optionType} value={optionType}>
                      {elementDefinitions[optionType].label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <RangeField
            id={`width-${element.id}`}
            label="Larghezza"
            value={element.width}
            min={definition.min}
            max={definition.max}
            step={definition.step}
            displayValue={formatMeters(element.width)}
            unitLabel="m"
            onChange={onWidthChange}
          />

          {treeHeightControl && element.treeHeight !== undefined ? (
            <RangeField
              id={`tree-height-${element.id}`}
              label="Altezza alberi"
              value={element.treeHeight}
              min={treeHeightControl.min}
              max={treeHeightControl.max}
              step={treeHeightControl.step}
              displayValue={formatMeters(element.treeHeight)}
              unitLabel="m"
              onChange={onTreeHeightChange}
            />
          ) : null}
        </FieldGroup>
      </CardContent>

      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isFirst}
            onClick={onMoveLeft}
          >
            <ArrowLeft data-icon="inline-start" />
            Sinistra
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isLast}
            onClick={onMoveRight}
          >
            <ArrowRight data-icon="inline-start" />
            Destra
          </Button>
        </div>

        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 data-icon="inline-start" />
          Rimuovi
        </Button>
      </CardFooter>
    </Card>
  )
}

interface RangeFieldProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  displayValue: string
  unitLabel: string
  onChange: (value: number) => void
}

function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  displayValue,
  unitLabel,
  onChange,
}: RangeFieldProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {displayValue}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Slider
          id={id}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(values) => {
            const nextValue = values[0]

            if (nextValue !== undefined) {
              onChange(nextValue)
            }
          }}
          aria-label={label}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Input
            id={`${id}-input`}
            type="number"
            min={min}
            max={max}
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
    </Field>
  )
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function SectionBandPreview({ elements }: { elements: SectionElement[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/70 bg-background/85 p-3">
      <div className="flex min-h-28 overflow-hidden rounded-[18px] border border-border/60 bg-background/70">
        {elements.map((element) => {
          const definition = elementDefinitions[element.type]

          return (
            <div
              key={element.id}
              className="flex min-w-10 items-end justify-center border-r border-foreground/8 px-1 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] last:border-r-0"
              style={{
                flexGrow: element.width,
                background: definition.fill,
                color: definition.textColor,
              }}
            >
              <span className="truncate opacity-80">
                {definition.shortLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatMeters(value: number) {
  const formattedValue = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, "")

  return `${formattedValue.replace(".", ",")} m`
}

function formatDrawingMm(widthInMeters: number, scale: number) {
  const widthInMillimeters = (widthInMeters * 1000) / scale
  const value =
    widthInMillimeters >= 100
      ? Math.round(widthInMillimeters)
      : Number(widthInMillimeters.toFixed(1))

  return `${String(value).replace(".", ",")} mm`
}

export default App
