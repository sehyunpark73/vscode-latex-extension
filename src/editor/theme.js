const vscode = require("vscode")
const path = require("path")
const { parse } = require("jsonc-parser")

const MAX_INCLUDE_DEPTH = 8
const COMMENT_SCOPE = "comment.line.number-sign.python"
const DOCSTRING_SCOPE = "string.quoted.docstring.multi.python"

function foreground(rule) {
    const value = rule?.settings?.foreground
    const color = typeof value === "string" ? value.trim() : ""
    return color.startsWith("#") ? color : null
}

function scopeColor(rules, scope) {
    let best = null
    for (const rule of rules) {
        const color = foreground(rule)
        if (!color || !rule.scope) continue

        const entries = Array.isArray(rule.scope) ? rule.scope : rule.scope.split(",")
        for (const entry of entries) {
            const selector = entry.trim().split(/\s+/).pop()
            if (!selector) continue
            if (scope !== selector && !scope.startsWith(selector + ".")) continue
            if (!best || selector.length >= best.weight) best = { color, weight: selector.length }
        }
    }
    return best?.color ?? null
}

async function readRules(file, depth = 0) {
    if (depth > MAX_INCLUDE_DEPTH) return []

    let theme
    try {
        const bytes = await vscode.workspace.fs.readFile(file)
        theme = parse(Buffer.from(bytes).toString("utf8"))
    } catch {
        return []
    }

    const own = Array.isArray(theme?.tokenColors) ? theme.tokenColors : []
    if (!theme?.include) return own

    const parent = vscode.Uri.file(path.join(path.dirname(file.fsPath), theme.include))
    return [...(await readRules(parent, depth + 1)), ...own]
}

function themeUri(label) {
    for (const extension of vscode.extensions.all) {
        const themes = extension.packageJSON?.contributes?.themes
        if (!Array.isArray(themes)) continue

        for (const entry of themes) {
            if (entry.label === label || entry.id === label) {
                return vscode.Uri.file(path.join(extension.extensionPath, entry.path))
            }
        }
    }
    return null
}

async function loadTheme() {
    const label = vscode.workspace.getConfiguration("workbench").get("colorTheme")
    const file = label ? themeUri(label) : null
    const rules = file ? await readRules(file) : []

    return {
        comment: scopeColor(rules, COMMENT_SCOPE),
        docstring: scopeColor(rules, DOCSTRING_SCOPE),
    }
}

module.exports = { loadTheme }
