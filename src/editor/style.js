const vscode = require("vscode")

const DEFAULT_FONT_SIZE = 14
const AUTO_LINE_HEIGHT = 1.5
const MULTIPLIER_LIMIT = 8
const LINE_HEIGHT_MARGIN = 0.95
const EX_PER_EM = 0.55

function readStyle() {
    const editor = vscode.workspace.getConfiguration("editor")
    const em = editor.get("fontSize", DEFAULT_FONT_SIZE)
    const raw = editor.get("lineHeight", 0)
    const lineHeight = !raw ? em * AUTO_LINE_HEIGHT : raw < MULTIPLIER_LIMIT ? em * raw : raw

    return {
        em,
        ex: em * EX_PER_EM,
        lineHeight: lineHeight * LINE_HEIGHT_MARGIN,
    }
}

module.exports = { readStyle }
