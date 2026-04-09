import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react"

import { elementDefinitions, paletteOrder } from "@/data/sectionLibrary"
import type { ElementType, SectionElement } from "@/types"
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
import { Slider } from "@/components/ui/slider"
import { formatMeters } from "./editorHelpers"

interface SelectionInspectorProps {
  elements: SectionElement[]
  activeElement: SectionElement | null
  activeIndex: number
  onTypeChange: (id: string, nextType: ElementType) => void
  onWidthChange: (id: string, value: number) => void
  onTreeHeightChange: (id: string, value: number) => void
  onMoveLeft: (id: string) => void
  onMoveRight: (id: string) => void
  onRemove: (id: string) => void
}

export function SelectionInspector({
  elements,
  activeElement,
  activeIndex,
  onTypeChange,
  onWidthChange,
  onTreeHeightChange,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: SelectionInspectorProps) {
  const activeDefinition = activeElement
    ? elementDefinitions[activeElement.type]
    : null

  return (
    <aside className="xl:sticky xl:top-4 xl:self-start">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-background/88 shadow-[0_18px_60px_rgba(23,34,33,0.06)]">
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-foreground">Editor fascia</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              La modifica e sempre contestuale alla fascia selezionata.
            </p>
          </div>

          {activeElement && activeDefinition ? (
            <div
              key={activeElement.id}
              className="flex flex-col gap-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Badge variant="secondary">
                    Fascia {activeIndex + 1} di {elements.length}
                  </Badge>
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-foreground">
                      {activeDefinition.label}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {activeDefinition.description}
                    </p>
                  </div>
                </div>
                <span
                  className="mt-1 size-3 shrink-0 rounded-full ring-1 ring-foreground/10"
                  style={{ background: activeDefinition.fill }}
                />
              </div>

              <FieldGroup>
                <Field>
                  <FieldLabel>Tipologia</FieldLabel>
                  <Select
                    value={activeElement.type}
                    onValueChange={(value) =>
                      onTypeChange(activeElement.id, value as ElementType)
                    }
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
                  <FieldDescription>
                    Cambia il tipo senza uscire dalla selezione corrente.
                  </FieldDescription>
                </Field>

                <RangeField
                  id={`width-${activeElement.id}`}
                  label="Larghezza"
                  value={activeElement.width}
                  min={activeDefinition.min}
                  max={activeDefinition.max}
                  step={activeDefinition.step}
                  unitLabel="m"
                  onChange={(value) => onWidthChange(activeElement.id, value)}
                />

                {activeDefinition.treeHeightControl &&
                activeElement.treeHeight !== undefined ? (
                  <RangeField
                    id={`tree-height-${activeElement.id}`}
                    label="Altezza alberi"
                    value={activeElement.treeHeight}
                    min={activeDefinition.treeHeightControl.min}
                    max={activeDefinition.treeHeightControl.max}
                    step={activeDefinition.treeHeightControl.step}
                    unitLabel="m"
                    onChange={(value) =>
                      onTreeHeightChange(activeElement.id, value)
                    }
                  />
                ) : null}
              </FieldGroup>

              <Separator />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeIndex <= 0}
                  onClick={() => onMoveLeft(activeElement.id)}
                >
                  <ArrowLeft data-icon="inline-start" />
                  Sposta a sinistra
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={activeIndex === -1 || activeIndex >= elements.length - 1}
                  onClick={() => onMoveRight(activeElement.id)}
                >
                  <ArrowRight data-icon="inline-start" />
                  Sposta a destra
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemove(activeElement.id)}
                >
                  <Trash2 data-icon="inline-start" />
                  Rimuovi
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border bg-muted/35 px-4 py-6 text-sm leading-6 text-muted-foreground">
              Clicca una fascia della sezione per aprire i controlli di
              tipologia e dimensione.
            </div>
          )}
        </div>
      </section>
    </aside>
  )
}

interface RangeFieldProps {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
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
  unitLabel,
  onChange,
}: RangeFieldProps) {
  return (
    <Field>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {formatMeters(value)}
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
