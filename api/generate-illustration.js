export const config = {
  maxDuration: 60,
}

const ELEMENT_LABELS = {
  lane: "vehicular lane",
  cycleway: "cycleway",
  sidewalk: "sidewalk",
  treeStrip: "tree strip",
  plantedBed: "planted bed",
  lawn: "lawn strip",
  bioswale: "bioswale",
  streetFurniture: "street furniture zone",
  parking: "parking lane",
  median: "median",
}

function formatMeters(value) {
  const safeValue = Number.isFinite(value) ? value : 0
  const normalized = Number.isInteger(safeValue)
    ? safeValue.toFixed(0)
    : safeValue.toFixed(1).replace(/\.0$/, "")

  return `${normalized}m`
}

function buildElementSequence(elements) {
  return elements
    .map((element, index) => {
      const label = ELEMENT_LABELS[element.type] || element.type
      const width = formatMeters(element.width)
      const treeHeight =
        element.type === "treeStrip" && Number.isFinite(element.treeHeight)
          ? `, trees about ${formatMeters(element.treeHeight)} tall`
          : ""

      return `${index + 1}. ${label}, width ${width}${treeHeight}`
    })
    .join("; ")
}

function buildPrompt({ projectTitle, scale, totalWidth, elements }) {
  const elementSequence = buildElementSequence(elements)
  const safeTitle = typeof projectTitle === "string" && projectTitle.trim()
    ? projectTitle.trim()
    : "Urban street section"

  return [
    `Create a refined architectural street-section illustration titled "${safeTitle}".`,
    `The composition must be a horizontal orthographic street section, not perspective, not axonometric, centered on a white background with very little empty margin above and below.`,
    `Use a sober dark-blue and blue-gray palette, elegant realistic materials, realistic but restrained trees, clean shadows, clear pavement and road markings, and an overall premium competition-board aesthetic.`,
    `Respect the relative widths of the bands clearly from left to right using this exact ordered program: ${elementSequence}.`,
    `The total street width is ${formatMeters(totalWidth)} and the technical reference scale is 1:${scale}.`,
    `Important constraints: no buildings, no text, no labels, no dimensions, no arrows, no legend, no border, no exploded diagrams, no collage look, no photorealistic street perspective.`,
    `The result should feel like a polished illustrated rendering of a street section, suitable for presentation, while staying faithful to the section layout.`,
  ].join(" ")
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return res.status(405).json({ error: "Method not allowed." })
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error:
        "Per generare l'illustrazione AI serve configurare OPENAI_API_KEY lato server.",
    })
  }

  const { projectTitle, scale, totalWidth, elements } = req.body || {}

  if (!Array.isArray(elements) || elements.length === 0) {
    return res.status(400).json({
      error: "Serve almeno una fascia per generare l'illustrazione.",
    })
  }

  const prompt = buildPrompt({
    projectTitle,
    scale: Number.isFinite(scale) ? scale : 100,
    totalWidth: Number.isFinite(totalWidth) ? totalWidth : 0,
    elements,
  })

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1.5",
        prompt,
        size: "1536x1024",
        quality: "medium",
        background: "opaque",
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          payload?.error?.message ??
          "OpenAI non ha restituito un'immagine valida.",
      })
    }

    const imageBase64 = payload?.data?.[0]?.b64_json
    const revisedPrompt = payload?.data?.[0]?.revised_prompt ?? null

    if (!imageBase64) {
      return res.status(502).json({
        error: "La risposta OpenAI non contiene un'immagine utilizzabile.",
      })
    }

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${imageBase64}`,
      revisedPrompt,
    })
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Errore imprevisto durante la generazione AI.",
    })
  }
}
