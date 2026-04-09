import treeConiferHref from "../assets/tree-illustrations/tree-b.png?inline"
import treeRoundHref from "../assets/tree-illustrations/tree-d.png?inline"
import treeDenseHref from "../assets/tree-illustrations/tree-f.png?inline"

export interface TreeIllustration {
  name: string
  sourceWidth: number
  sourceHeight: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
  href: string
}

export const treeIllustrations: TreeIllustration[] = [
  {
    name: "misto-round",
    sourceWidth: 46,
    sourceHeight: 46,
    cropX: 0,
    cropY: 0,
    cropWidth: 28,
    cropHeight: 42,
    href: treeRoundHref,
  },
  {
    name: "misto-dense",
    sourceWidth: 44,
    sourceHeight: 48,
    cropX: 13,
    cropY: 2,
    cropWidth: 17,
    cropHeight: 42,
    href: treeDenseHref,
  },
  {
    name: "misto-conifer",
    sourceWidth: 44,
    sourceHeight: 48,
    cropX: 0,
    cropY: 0,
    cropWidth: 15,
    cropHeight: 34,
    href: treeConiferHref,
  },
]
