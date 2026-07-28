const vscode = require("vscode")
const { findSpans } = require("../tex/lexer")
const { render } = require("../tex/renderer")

const DARK_FOREGROUND = "#d4d4d4"
const LIGHT_FOREGROUND = "#1f1f1f"
const WARNING_STYLE = "var(--vscode-editorWarning-foreground, #cca700)"

function fallbackColor() {
    const { kind } = vscode.window.activeColorTheme
    const dark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast
    return dark ? DARK_FOREGROUND : LIGHT_FOREGROUND
}

function cursorLines(editor) {
    const lines = new Set()
    for (const selection of editor.selections) {
        for (let line = selection.start.line; line <= selection.end.line; line += 1) {
            lines.add(line)
        }
    }
    return lines
}

function imageAt(position, paint) {
    return {
        range: new vscode.Range(position, position),
        renderOptions: {
            after: {
                contentIconPath: vscode.Uri.parse(paint.uri),
                width: `${paint.width}px`,
                height: `${paint.height}px`,
                textDecoration: `none; vertical-align: ${paint.baseline}px; background-size: contain; background-repeat: no-repeat;`,
            },
        },
    }
}

class Painter {
    constructor() {
        this.source = vscode.window.createTextEditorDecorationType({
            textDecoration: "none; display: none;",
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
        this.image = vscode.window.createTextEditorDecorationType({
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
        this.warning = vscode.window.createTextEditorDecorationType({
            textDecoration: `none; text-decoration: underline wavy ${WARNING_STYLE}; text-decoration-skip-ink: none;`,
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
        })
    }

    paint(editor, style, theme) {
        const { document } = editor
        const revealed = cursorLines(editor)
        const sources = []
        const images = []
        const warnings = []

        for (const span of findSpans(document.getText())) {
            const start = document.positionAt(span.start)
            const end = document.positionAt(span.end)
            if (start.line !== end.line) continue

            const color = theme[span.kind] || fallbackColor()
            const paint = render(span.tex, { ...style, color })
            if (!paint) {
                warnings.push(new vscode.Range(start, end))
                continue
            }

            if (revealed.has(start.line)) continue

            sources.push(new vscode.Range(start, end))
            images.push(imageAt(end, paint))
        }

        editor.setDecorations(this.source, sources)
        editor.setDecorations(this.image, images)
        editor.setDecorations(this.warning, warnings)
    }

    dispose() {
        this.source.dispose()
        this.image.dispose()
        this.warning.dispose()
    }
}

module.exports = Painter
