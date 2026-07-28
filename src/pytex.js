const vscode = require("vscode")
const { readStyle, loadTheme } = require("./editor/style")
const Painter = require("./editor/painter")

const LANGUAGE = "python"
const DEBOUNCE_MS = 100
const THEME_KEY = "workbench.colorTheme"
const METRIC_KEYS = ["editor.fontSize", "editor.lineHeight"]

class Pytex {
    constructor() {
        this.painter = new Painter()
        this.timers = new Map()
        this.theme = { comment: null, docstring: null }
    }

    activate(context) {
        const { window, workspace, commands } = vscode

        context.subscriptions.push(
            window.onDidChangeVisibleTextEditors(() => this.refresh()),
            window.onDidChangeTextEditorSelection((event) => this.schedule(event.textEditor)),
            window.onDidChangeActiveColorTheme(() => this.reload()),
            workspace.onDidChangeTextDocument((event) => this.refresh(event.document)),
            workspace.onDidChangeConfiguration((event) => this.onConfigChange(event)),
            commands.registerCommand("pytex.reload", () => this.reload()),
        )

        this.refresh()
        this.reload()
    }

    refresh(document) {
        for (const editor of vscode.window.visibleTextEditors) {
            if (!document || editor.document === document) this.schedule(editor)
        }
    }

    schedule(editor) {
        if (editor.document.languageId !== LANGUAGE) return

        const key = `${editor.document.uri}#${editor.viewColumn ?? 0}`
        clearTimeout(this.timers.get(key))
        this.timers.set(
            key,
            setTimeout(() => {
                this.timers.delete(key)
                this.draw(editor)
            }, DEBOUNCE_MS),
        )
    }

    draw(editor) {
        try {
            this.painter.paint(editor, readStyle(), this.theme)
        } catch (error) {
            console.error("[pytex] draw failed:", error)
        }
    }

    async reload() {
        this.theme = await loadTheme()
        this.refresh()
    }

    onConfigChange(event) {
        if (event.affectsConfiguration(THEME_KEY)) this.reload()
        else if (METRIC_KEYS.some((key) => event.affectsConfiguration(key))) this.refresh()
    }

    dispose() {
        for (const timer of this.timers.values()) clearTimeout(timer)
        this.timers.clear()
        this.painter.dispose()
    }
}

module.exports = Pytex
