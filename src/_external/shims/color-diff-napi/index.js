'use strict'

class ColorDiff {
  constructor(_patch, _firstLine, _filePath, _fileContent) {}

  render(_theme, _width, _dim) {
    return []
  }
}

class ColorFile {
  constructor(_filePath, _content) {}

  render(_theme, _width, _dim) {
    return []
  }
}

function getSyntaxTheme(_name) {
  return null
}

module.exports = { ColorDiff, ColorFile, getSyntaxTheme }
