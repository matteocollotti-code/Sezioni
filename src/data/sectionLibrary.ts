import type {
  ElementDefinition,
  ElementType,
  SectionElement,
  SectionMetrics,
  SectionPreset,
} from '../types'

export const scalePresets = [50, 100, 200]

export const paletteOrder: ElementType[] = [
  'lane',
  'cycleway',
  'sidewalk',
  'treeStrip',
  'plantedBed',
  'lawn',
  'bioswale',
  'streetFurniture',
  'parking',
  'median',
]

export const elementDefinitions: Record<ElementType, ElementDefinition> = {
  lane: {
    label: 'Carreggiata',
    shortLabel: 'car',
    description: 'Corsia carrabile o piattaforma stradale per traffico motorizzato.',
    defaultWidth: 3.5,
    min: 2.5,
    max: 7,
    step: 0.1,
    fill: '#4d565d',
    stroke: '#2b3137',
    textColor: '#f7f6f1',
  },
  cycleway: {
    label: 'Ciclabile',
    shortLabel: 'bike',
    description: 'Corsia o pista ciclabile dedicata, separata e facilmente leggibile.',
    defaultWidth: 2.2,
    min: 1.5,
    max: 4,
    step: 0.1,
    fill: '#7aa59b',
    stroke: '#4c7068',
    textColor: '#10312b',
  },
  sidewalk: {
    label: 'Marciapiede',
    shortLabel: 'ped',
    description: 'Spazio pedonale continuo per accessibilita, sosta e attraversamenti.',
    defaultWidth: 2.4,
    min: 1.2,
    max: 6,
    step: 0.1,
    fill: '#ddd5c7',
    stroke: '#b2a797',
    textColor: '#3a3228',
  },
  treeStrip: {
    label: 'Filare alberato',
    shortLabel: 'tree',
    description: 'Fascia verde alberata con alloggiamento per alberi e suolo permeabile.',
    defaultWidth: 2.5,
    min: 1.5,
    max: 5,
    step: 0.1,
    fill: '#d7e6ce',
    stroke: '#8eaa82',
    textColor: '#244122',
    treeHeightControl: {
      defaultValue: 12,
      min: 4,
      max: 25,
      step: 0.5,
    },
  },
  plantedBed: {
    label: 'Aiuola',
    shortLabel: 'bed',
    description: 'Verde ornamentale o fascia drenante con arbusti e coperture erbacee.',
    defaultWidth: 1.8,
    min: 1,
    max: 4,
    step: 0.1,
    fill: '#bfd7b3',
    stroke: '#7fa069',
    textColor: '#284223',
  },
  lawn: {
    label: 'Prato',
    shortLabel: 'green',
    description: 'Prato o tappeto verde leggero per margini, parchi lineari e buffer.',
    defaultWidth: 2,
    min: 1,
    max: 6,
    step: 0.1,
    fill: '#dbe7ba',
    stroke: '#99ac72',
    textColor: '#314324',
  },
  bioswale: {
    label: 'Rain garden',
    shortLabel: 'bio',
    description: 'Depressione vegetata per drenaggio urbano, fitodepurazione o raccolta acque.',
    defaultWidth: 2.2,
    min: 1.2,
    max: 5,
    step: 0.1,
    fill: '#b6d0b5',
    stroke: '#6f9270',
    textColor: '#244022',
  },
  streetFurniture: {
    label: 'Arredo urbano',
    shortLabel: 'urb',
    description: 'Spazio per sedute, pali luce, segnaletica, rastrelliere o attrezzature.',
    defaultWidth: 1.6,
    min: 0.8,
    max: 4,
    step: 0.1,
    fill: '#d7c8b3',
    stroke: '#a28768',
    textColor: '#493829',
  },
  parking: {
    label: 'Sosta',
    shortLabel: 'park',
    description: 'Fascia di sosta o parcheggio laterale, utile per buffering e servizio.',
    defaultWidth: 2.3,
    min: 1.8,
    max: 3.5,
    step: 0.1,
    fill: '#cfd4d8',
    stroke: '#8b949e',
    textColor: '#2e3439',
  },
  median: {
    label: 'Spartitraffico',
    shortLabel: 'med',
    description: 'Separatore centrale o isola tecnica per moderazione e protezione.',
    defaultWidth: 1.4,
    min: 0.6,
    max: 4,
    step: 0.1,
    fill: '#f0e5d5',
    stroke: '#bca78a',
    textColor: '#57463a',
  },
}

export const sectionPresets: SectionPreset[] = [
  {
    id: 'boulevard-urbano',
    name: 'Boulevard urbano',
    summary: 'Due carreggiate, filari e ciclabile protetta in un profilo ampio ma sobrio.',
    elements: [
      { type: 'sidewalk', width: 3 },
      { type: 'treeStrip', width: 2.4, treeHeight: 12 },
      { type: 'cycleway', width: 2.2 },
      { type: 'lane', width: 3.4 },
      { type: 'lane', width: 3.4 },
      { type: 'median', width: 1.6 },
      { type: 'lane', width: 3.4 },
      { type: 'lane', width: 3.4 },
      { type: 'cycleway', width: 2.2 },
      { type: 'treeStrip', width: 2.4, treeHeight: 12 },
      { type: 'sidewalk', width: 3 },
    ],
  },
  {
    id: 'green-corridor',
    name: 'Green corridor',
    summary: 'Profilo piu verde con rain garden, prato e percorso ciclabile bidirezionale.',
    elements: [
      { type: 'sidewalk', width: 2.5 },
      { type: 'bioswale', width: 2.2 },
      { type: 'cycleway', width: 3 },
      { type: 'treeStrip', width: 2.6, treeHeight: 14 },
      { type: 'lane', width: 3.3 },
      { type: 'lane', width: 3.3 },
      { type: 'lawn', width: 3 },
      { type: 'lane', width: 3.3 },
      { type: 'parking', width: 2.3 },
      { type: 'streetFurniture', width: 1.5 },
      { type: 'sidewalk', width: 2.8 },
    ],
  },
  {
    id: 'piazza-mobility',
    name: 'Piazza mobility',
    summary: 'Sezione calma con marciapiedi generosi, arredo e piattaforma centrale ridotta.',
    elements: [
      { type: 'sidewalk', width: 4.2 },
      { type: 'streetFurniture', width: 1.8 },
      { type: 'plantedBed', width: 1.6 },
      { type: 'cycleway', width: 2.2 },
      { type: 'lane', width: 3.2 },
      { type: 'median', width: 1.2 },
      { type: 'lane', width: 3.2 },
      { type: 'cycleway', width: 2.2 },
      { type: 'plantedBed', width: 1.6 },
      { type: 'streetFurniture', width: 1.8 },
      { type: 'sidewalk', width: 4.2 },
    ],
  },
]

const greenTypes = new Set<ElementType>([
  'treeStrip',
  'plantedBed',
  'lawn',
  'bioswale',
])

const activeMobilityTypes = new Set<ElementType>(['cycleway', 'sidewalk'])
const vehicularTypes = new Set<ElementType>(['lane', 'parking'])

export function clampWidth(type: ElementType, value: number) {
  const normalizedValue = Number.isFinite(value) ? value : elementDefinitions[type].defaultWidth
  return Number(Math.max(0.1, normalizedValue).toFixed(1))
}

export function clampTreeHeight(type: ElementType, value: number) {
  const control = elementDefinitions[type].treeHeightControl

  if (!control) {
    return undefined
  }

  const clampedValue = Math.min(control.max, Math.max(control.min, value))
  return Number(clampedValue.toFixed(1))
}

export function getDefaultTreeHeight(type: ElementType) {
  return elementDefinitions[type].treeHeightControl?.defaultValue
}

export function createSectionElement(
  type: ElementType,
  width: number,
  treeHeight?: number,
): SectionElement {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `segment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    width: clampWidth(type, width),
    treeHeight:
      treeHeight !== undefined
        ? clampTreeHeight(type, treeHeight)
        : getDefaultTreeHeight(type),
  }
}

export function calculateMetrics(elements: SectionElement[]): SectionMetrics {
  const totalWidth = elements.reduce((sum, element) => sum + element.width, 0)
  const greenWidth = elements.reduce(
    (sum, element) => sum + (greenTypes.has(element.type) ? element.width : 0),
    0,
  )
  const activeMobilityWidth = elements.reduce(
    (sum, element) =>
      sum + (activeMobilityTypes.has(element.type) ? element.width : 0),
    0,
  )
  const vehicularWidth = elements.reduce(
    (sum, element) => sum + (vehicularTypes.has(element.type) ? element.width : 0),
    0,
  )

  return {
    totalWidth: Number(totalWidth.toFixed(1)),
    greenWidth: Number(greenWidth.toFixed(1)),
    activeMobilityWidth: Number(activeMobilityWidth.toFixed(1)),
    vehicularWidth: Number(vehicularWidth.toFixed(1)),
    supportWidth: Number(
      (totalWidth - greenWidth - activeMobilityWidth - vehicularWidth).toFixed(1),
    ),
  }
}
