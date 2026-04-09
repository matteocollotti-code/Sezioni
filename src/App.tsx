import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import {
  calculateMetrics,
  clampWidth,
  createSectionElement,
  elementDefinitions,
  paletteOrder,
  scalePresets,
  sectionPresets,
} from './data/sectionLibrary'
import type {
  ElementType,
  ExportVariant,
  SectionElement,
  SectionPreset,
} from './types'
import { buildDownloadName, generateRoadSectionSvg } from './utils/sectionSvg'

const defaultPreset = sectionPresets[0]

function App() {
  const [projectTitle, setProjectTitle] = useState('Sezione urbana alberata')
  const [scale, setScale] = useState(100)
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id)
  const [previewVariant, setPreviewVariant] = useState<ExportVariant>('illustrated')
  const [elements, setElements] = useState(() =>
    defaultPreset.elements.map((item) =>
      createSectionElement(item.type, item.width),
    ),
  )

  const metrics = calculateMetrics(elements)
  const exportModel = useMemo(
    () => ({
      projectTitle,
      scale,
      elements,
    }),
    [elements, projectTitle, scale],
  )
  const deferredModel = useDeferredValue(exportModel)
  const svgMarkup = useMemo(
    () => generateRoadSectionSvg(deferredModel, previewVariant),
    [deferredModel, previewVariant],
  )
  const isPreviewPending = deferredModel !== exportModel
  const usedTypes = Array.from(new Set(elements.map((element) => element.type)))

  const applyPreset = (preset: SectionPreset) => {
    startTransition(() => {
      setSelectedPresetId(preset.id)
      setProjectTitle(preset.name)
      setElements(
        preset.elements.map((item) => createSectionElement(item.type, item.width)),
      )
    })
  }

  const markAsCustom = () => {
    setSelectedPresetId('custom')
  }

  const updateScale = (value: number) => {
    if (!Number.isFinite(value)) {
      return
    }

    setScale(Math.min(500, Math.max(25, Math.round(value))))
  }

  const updateElement = (
    id: string,
    updater: (element: SectionElement) => SectionElement,
  ) => {
    setElements((currentElements) =>
      currentElements.map((element) =>
        element.id === id ? updater(element) : element,
      ),
    )
    markAsCustom()
  }

  const handleTypeChange = (id: string, nextType: ElementType) => {
    updateElement(id, (element) => ({
      ...element,
      type: nextType,
      width: clampWidth(nextType, element.width),
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
      currentElements.filter((element) => element.id !== id),
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
      sectionPresets.find((preset) => preset.id === selectedPresetId) ?? defaultPreset
    applyPreset(fallbackPreset)
  }

  const downloadSvg = (variant: ExportVariant) => {
    const markup = generateRoadSectionSvg(exportModel, variant)
    const svgBlob = new Blob([markup], {
      type: 'image/svg+xml;charset=utf-8',
    })
    const objectUrl = URL.createObjectURL(svgBlob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${buildDownloadName(projectTitle, variant)}.svg`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <div className="hero__eyebrow">Sezioni vettoriali per lo spazio pubblico</div>
          <h1>Compone sezioni stradali pulite, scalate e subito scaricabili in SVG.</h1>
          <p>
            Aggiungi carreggiate, ciclabili, alberature, verde e arredo urbano.
            Regola ogni fascia con slider o input numerico e scarica sia una
            versione illustrata sia una versione clean pronta per la
            postproduzione.
          </p>

          <div className="hero__highlights">
            <div>
              <span>Editor live</span>
              <strong>{elements.length} fasce modificabili</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>SVG quotato in scala 1:{scale}</strong>
            </div>
            <div>
              <span>Larghezza totale</span>
              <strong>{formatMeters(metrics.totalWidth)}</strong>
            </div>
          </div>
        </div>

        <div className="hero__visual" aria-hidden="true">
          <div className="hero__ruler">
            <span>schema dinamico</span>
            <span>{formatMeters(metrics.greenWidth)} di verde</span>
          </div>
          <div className="hero__section">
            {elements.map((element) => {
              const definition = elementDefinitions[element.type]

              return (
                <span
                  key={element.id}
                  className="hero__segment"
                  style={{
                    flexGrow: element.width,
                    background: definition.fill,
                    color: definition.textColor,
                  }}
                >
                  <small>{definition.shortLabel}</small>
                </span>
              )
            })}
          </div>
          <div className="hero__notes">
            <span>scala</span>
            <strong>1:{scale}</strong>
            <span>larghezza in tavola</span>
            <strong>{formatDrawingMm(metrics.totalWidth, scale)}</strong>
          </div>
        </div>
      </header>

      <main className="workspace">
        <aside className="panel panel--controls">
          <section className="panel__section">
            <div className="panel__eyebrow">Setup progetto</div>
            <label className="field">
              <span>Titolo della tavola</span>
              <input
                className="field__input"
                type="text"
                value={projectTitle}
                onChange={(event) => setProjectTitle(event.target.value)}
                placeholder="Sezione urbana"
              />
            </label>

            <label className="field">
              <span>Scala di esportazione</span>
              <input
                className="field__input"
                type="number"
                min={25}
                max={500}
                step={5}
                value={scale}
                onChange={(event) => updateScale(Number(event.target.value))}
              />
            </label>

            <div className="scale-pills" role="list" aria-label="Scale consigliate">
              {scalePresets.map((scalePreset) => (
                <button
                  key={scalePreset}
                  className={`pill-button${scale === scalePreset ? ' is-active' : ''}`}
                  type="button"
                  onClick={() => updateScale(scalePreset)}
                >
                  1:{scalePreset}
                </button>
              ))}
            </div>
          </section>

          <section className="panel__section">
            <div className="panel__header">
              <div>
                <div className="panel__eyebrow">Preset</div>
                <h2>Impianti iniziali</h2>
              </div>
              <button className="ghost-button" type="button" onClick={resetCurrentPreset}>
                Ripristina
              </button>
            </div>

            <div className="preset-grid">
              {sectionPresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`preset-button${selectedPresetId === preset.id ? ' is-selected' : ''}`}
                  type="button"
                  onClick={() => applyPreset(preset)}
                >
                  <strong>{preset.name}</strong>
                  <span>{preset.summary}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel__section">
            <div className="panel__header">
              <div>
                <div className="panel__eyebrow">Palette urbana</div>
                <h2>Aggiungi fasce</h2>
              </div>
            </div>

            <div className="palette-grid">
              {paletteOrder.map((type) => {
                const definition = elementDefinitions[type]

                return (
                  <button
                    key={type}
                    className="palette-button"
                    type="button"
                    onClick={() => addElement(type)}
                  >
                    <span
                      className="palette-button__swatch"
                      style={{ background: definition.fill }}
                    />
                    <strong>{definition.label}</strong>
                    <small>{definition.description}</small>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="panel__section">
            <div className="panel__header">
              <div>
                <div className="panel__eyebrow">Configurazione</div>
                <h2>Elementi della sezione</h2>
              </div>
              <span className="status-chip">
                {selectedPresetId === 'custom' ? 'personalizzata' : 'preset'}
              </span>
            </div>

            <ul className="element-list">
              {elements.map((element, index) => {
                const definition = elementDefinitions[element.type]

                return (
                  <li className="element-row" key={element.id}>
                    <div className="element-row__header">
                      <div className="element-row__title">
                        <span
                          className="element-row__swatch"
                          style={{ background: definition.fill }}
                        />
                        <div>
                          <span className="element-row__index">
                            Fascia {index + 1}
                          </span>
                          <select
                            className="select-input"
                            value={element.type}
                            onChange={(event) =>
                              handleTypeChange(
                                element.id,
                                event.target.value as ElementType,
                              )
                            }
                          >
                            {paletteOrder.map((optionType) => (
                              <option key={optionType} value={optionType}>
                                {elementDefinitions[optionType].label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="element-row__actions">
                        <span className="element-row__value">
                          {formatMeters(element.width)}
                        </span>
                        <button
                          aria-label={`Rimuovi ${definition.label}`}
                          className="icon-button"
                          type="button"
                          onClick={() => removeElement(element.id)}
                        >
                          x
                        </button>
                      </div>
                    </div>

                    <p className="element-row__description">{definition.description}</p>

                    <label className="range-field">
                      <span>Larghezza</span>
                      <input
                        className="range-field__input"
                        type="range"
                        min={definition.min}
                        max={definition.max}
                        step={definition.step}
                        value={element.width}
                        onChange={(event) =>
                          handleWidthChange(element.id, event.target.value)
                        }
                      />
                    </label>

                    <div className="element-row__footer">
                      <label className="number-field">
                        <span>Metri</span>
                        <input
                          className="field__input"
                          type="number"
                          min={definition.min}
                          max={definition.max}
                          step={definition.step}
                          value={element.width}
                          onChange={(event) =>
                            handleWidthChange(element.id, event.target.value)
                          }
                        />
                      </label>

                      <div className="move-cluster">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => moveElement(element.id, -1)}
                        >
                          Sposta a sinistra
                        </button>
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => moveElement(element.id, 1)}
                        >
                          Sposta a destra
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>

        <section className="panel panel--preview">
          <div className="panel__section panel__section--compact">
            <div className="metrics-grid">
              <article>
                <span>totale</span>
                <strong>{formatMeters(metrics.totalWidth)}</strong>
              </article>
              <article>
                <span>verde</span>
                <strong>{formatMeters(metrics.greenWidth)}</strong>
              </article>
              <article>
                <span>mobilita attiva</span>
                <strong>{formatMeters(metrics.activeMobilityWidth)}</strong>
              </article>
              <article>
                <span>veicolare</span>
                <strong>{formatMeters(metrics.vehicularWidth)}</strong>
              </article>
            </div>
          </div>

          <div className="panel__section">
            <div className="panel__header">
              <div>
                <div className="panel__eyebrow">Anteprima</div>
                <h2>SVG quotato e aggiornato in tempo reale</h2>
              </div>
              <span className="status-chip">
                {isPreviewPending ? 'aggiorno...' : 'sincronizzata'}
              </span>
            </div>

            <div className="variant-switch" role="tablist" aria-label="Varianti export">
              <button
                className={`variant-switch__button${previewVariant === 'illustrated' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setPreviewVariant('illustrated')}
              >
                Illustrata
              </button>
              <button
                className={`variant-switch__button${previewVariant === 'clean' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setPreviewVariant('clean')}
              >
                Clean
              </button>
            </div>

            <div className="preview-frame">
              <div
                className="preview-svg"
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
            </div>

            <p className="preview-note">
              La variante <strong>{previewVariant === 'clean' ? 'clean' : 'illustrata'}</strong>{' '}
              {previewVariant === 'clean'
                ? 'mantiene solo campiture, quote e misure per facilitare la postproduzione.'
                : 'mantiene una simbologia vettoriale piu ricca per presentazioni e concept.'}
            </p>

            <div className="legend-row" role="list" aria-label="Legenda elementi usati">
              {usedTypes.map((type) => {
                const definition = elementDefinitions[type]

                return (
                  <span className="legend-chip" key={type} role="listitem">
                    <span
                      className="legend-chip__swatch"
                      style={{ background: definition.fill }}
                    />
                    {definition.label}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="panel__section panel__section--compact">
            <div className="export-grid">
              <div>
                <div className="panel__eyebrow">Export</div>
                <h2>Scarica il vettoriale in scala</h2>
                <p className="export-copy">
                  Esporta una tavola illustrata per comunicazione e una tavola
                  clean, con sole campiture cromatiche, quote e misure, da
                  postprodurre o rifinire nei tuoi software grafici.
                </p>
              </div>

              <div className="export-actions">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => downloadSvg('illustrated')}
                >
                  Scarica SVG illustrato
                </button>
                <button
                  className="ghost-button ghost-button--strong"
                  type="button"
                  onClick={() => downloadSvg('clean')}
                >
                  Scarica SVG clean
                </button>
                <div className="export-meta">
                  <span>{formatDrawingMm(metrics.totalWidth, scale)}</span>
                  <small>larghezza del disegno su tavola</small>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function formatMeters(value: number) {
  const formattedValue = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(1).replace(/\.0$/, '')

  return `${formattedValue.replace('.', ',')} m`
}

function formatDrawingMm(widthInMeters: number, scale: number) {
  const widthInMillimeters = (widthInMeters * 1000) / scale
  const value =
    widthInMillimeters >= 100
      ? Math.round(widthInMillimeters)
      : Number(widthInMillimeters.toFixed(1))

  return `${String(value).replace('.', ',')} mm`
}

export default App
