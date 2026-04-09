export type ElementType =
  | 'lane'
  | 'cycleway'
  | 'sidewalk'
  | 'treeStrip'
  | 'plantedBed'
  | 'lawn'
  | 'bioswale'
  | 'streetFurniture'
  | 'parking'
  | 'median'

export interface SectionElement {
  id: string
  type: ElementType
  width: number
  treeHeight?: number
}

export interface SectionPresetItem {
  type: ElementType
  width: number
  treeHeight?: number
}

export interface SectionPreset {
  id: string
  name: string
  summary: string
  elements: SectionPresetItem[]
}

export interface ElementDefinition {
  label: string
  shortLabel: string
  description: string
  defaultWidth: number
  min: number
  max: number
  step: number
  fill: string
  stroke: string
  textColor: string
  treeHeightControl?: {
    defaultValue: number
    min: number
    max: number
    step: number
  }
}

export interface SectionMetrics {
  totalWidth: number
  greenWidth: number
  activeMobilityWidth: number
  vehicularWidth: number
  supportWidth: number
}

export interface ExportModel {
  projectTitle: string
  scale: number
  elements: SectionElement[]
}

export type ExportVariant = 'illustrated' | 'clean'
