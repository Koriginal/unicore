import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type React from 'react'
import type { Command } from '../types/command.js'

export function createUnavailableCommand(name: string): Command {
  return {
    type: 'prompt',
    name,
    description: `${name} is unavailable in this build`,
    progressMessage: `Skipping ${name}`,
    contentLength: 0,
    source: 'builtin',
    async getPromptForCommand(): Promise<ContentBlockParam[]> {
      return [
        {
          type: 'text',
          text: `${name} is unavailable in this offline build.`,
        },
      ]
    },
    isEnabled: () => false,
  }
}

export function createUnavailableTool(name: string): any {
  return {
    name,
    async description() {
      return `${name} is unavailable in this build`
    },
    async prompt() {
      return `${name} is unavailable in this offline build`
    },
    isEnabled() {
      return false
    },
    isReadOnly() {
      return true
    },
    async validateInput() {
      return {
        result: false,
        message: `${name} is unavailable in this offline build`,
        errorCode: 1,
      }
    },
    async call() {
      return {
        data: {
          success: false,
          message: `${name} is unavailable in this offline build`,
        },
      }
    },
  }
}

export function createNullComponent(_name: string): React.FC<any> {
  return function OptionalFeaturePlaceholder() {
    return null
  }
}
