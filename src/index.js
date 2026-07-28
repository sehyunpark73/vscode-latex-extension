const Pytex = require("./pytex")

let pytex = null

function activate(context) {
    pytex = new Pytex()
    pytex.activate(context)
}

function deactivate() {
    pytex?.dispose()
    pytex = null
}

module.exports = { activate, deactivate }
