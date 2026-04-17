'use strict'

/** @type {Array<{ name: string }>} */
const BROWSER_TOOLS = []

function createUniCoreForChromeMcpServer(_context) {
  return {
    setRequestHandler() {},
    async connect() {},
  }
}

module.exports = {
  BROWSER_TOOLS,
  createUniCoreForChromeMcpServer,
}
