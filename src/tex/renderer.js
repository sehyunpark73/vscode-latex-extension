const CACHE_LIMIT = 512
const ERROR_MARKER = 'data-mml-node="merror"'

const WIDTH = /width="([\d.]+)ex"/
const HEIGHT = /height="([\d.]+)ex"/
const BASELINE = /vertical-align:\s*(-?[\d.]+)ex/

const cache = new Map()

let engine = null
let unavailable = false

function loadEngine() {
    if (engine || unavailable) return engine

    try {
        const { mathjax } = require("mathjax-full/js/mathjax.js")
        const { TeX } = require("mathjax-full/js/input/tex.js")
        const { SVG } = require("mathjax-full/js/output/svg.js")
        const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js")
        const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js")
        const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js")

        const adaptor = liteAdaptor()
        RegisterHTMLHandler(adaptor)
        engine = {
            adaptor,
            document: mathjax.document("", {
                InputJax: new TeX({ packages: AllPackages }),
                OutputJax: new SVG({ fontCache: "local" }),
            }),
        }
    } catch {
        unavailable = true
    }
    return engine
}

function measure(svg, ex, lineHeight) {
    const read = (pattern) => parseFloat(pattern.exec(svg)?.[1] ?? 0)
    let width = read(WIDTH) * ex
    let height = read(HEIGHT) * ex
    let baseline = read(BASELINE) * ex

    if (height > lineHeight) {
        const scale = lineHeight / height
        width *= scale
        height *= scale
        baseline *= scale
    }
    return { width, height, baseline }
}

function toArt(svg, ex, lineHeight, color) {
    if (svg.includes(ERROR_MARKER)) return null

    const size = measure(svg, ex, lineHeight)
    const styled = svg
        .replace(/currentColor/g, color)
        .replace(WIDTH, `width="${size.width}px"`)
        .replace(HEIGHT, `height="${size.height}px"`)

    return {
        uri: "data:image/svg+xml;base64," + Buffer.from(styled, "utf8").toString("base64"),
        ...size,
    }
}

function render(tex, { em, ex, lineHeight, color }) {
    const key = `${em}:${ex}:${lineHeight}:${color}:${tex}`
    if (cache.has(key)) return cache.get(key)

    const loaded = loadEngine()
    if (!loaded) return null

    const container = loaded.document.convert(tex, { display: false, em, ex })
    const svg = loaded.adaptor.outerHTML(loaded.adaptor.firstChild(container))
    const art = toArt(svg, ex, lineHeight, color)

    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value)
    cache.set(key, art)
    return art
}

module.exports = { render }
