const IDENTIFIER = /[A-Za-z0-9_]/
const WHITESPACE = /\s/
const INDENT = /[ \t]/

function isTriple(text, i) {
    return text[i + 1] === text[i] && text[i + 2] === text[i]
}

function isEscaped(text, i) {
    let backslashes = 0
    for (let k = i - 1; k >= 0 && text[k] === "\\"; k -= 1) backslashes += 1
    return backslashes % 2 === 1
}

function readComment(text, i) {
    let end = i + 1
    while (end < text.length && text[end] !== "\n") end += 1
    return { region: { kind: "comment", start: i + 1, end }, next: end }
}

function readString(text, i) {
    const quote = text[i]
    const triple = isTriple(text, i)
    const quoteLength = triple ? 3 : 1

    let j = i + quoteLength
    let closed = false
    while (j < text.length) {
        if (text[j] === "\\") {
            j += 2
            continue
        }
        if (!triple && text[j] === "\n") break
        if (text[j] === quote && (!triple || isTriple(text, j))) {
            closed = true
            break
        }
        j += 1
    }
    const end = Math.min(j, text.length)

    let k = i - 1
    while (k >= 0 && INDENT.test(text[k])) k -= 1
    const isDocstring = triple && (k < 0 || text[k] === "\n")

    return {
        region: isDocstring ? { kind: "docstring", start: i + quoteLength, end } : null,
        next: closed ? end + quoteLength : end,
    }
}

function findRegions(text) {
    const regions = []
    let i = 0
    while (i < text.length) {
        let read = null
        if (text[i] === "#") read = readComment(text, i)
        else if (text[i] === '"' || text[i] === "'") read = readString(text, i)

        if (!read) {
            i += 1
            continue
        }
        if (read.region) regions.push(read.region)
        i = read.next
    }
    return regions
}

function findClosing(text, from, to) {
    for (let i = from; i < to; i += 1) {
        if (text[i] === "\n") return -1
        if (text[i] !== "$" || isEscaped(text, i)) continue
        return WHITESPACE.test(text[i - 1]) ? -1 : i
    }
    return -1
}

function findSpans(text) {
    const spans = []
    for (const region of findRegions(text)) {
        let i = region.start
        while (i < region.end) {
            const next = text[i + 1]
            if (
                text[i] !== "$" ||
                isEscaped(text, i) ||
                !next ||
                WHITESPACE.test(next) ||
                IDENTIFIER.test(text[i - 1] || "")
            ) {
                i += 1
                continue
            }

            const close = findClosing(text, i + 1, region.end)
            if (close < 0) {
                i += 1
                continue
            }

            const tex = text.slice(i + 1, close)
            if (tex.trim()) spans.push({ kind: region.kind, start: i, end: close + 1, tex })
            i = close + 1
        }
    }
    return spans
}

module.exports = { findSpans }
