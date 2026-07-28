require("esbuild").build({
    entryPoints: ["src/index.js"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outfile: "dist/extension.js",
    external: ["vscode"],
    mainFields: ["module", "main"],
    minify: true,
})
