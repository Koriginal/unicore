// Content for the unicore-api bundled skill.
// Each .md file is inlined as a string at build time via Bun's text loader.

import csharpUniCoreApi from './unicore-api/csharp/unicore-api.md'
import curlExamples from './unicore-api/curl/examples.md'
import goUniCoreApi from './unicore-api/go/unicore-api.md'
import javaUniCoreApi from './unicore-api/java/unicore-api.md'
import phpUniCoreApi from './unicore-api/php/unicore-api.md'
import pythonAgentSdkPatterns from './unicore-api/python/agent-sdk/patterns.md'
import pythonAgentSdkReadme from './unicore-api/python/agent-sdk/README.md'
import pythonUniCoreApiBatches from './unicore-api/python/unicore-api/batches.md'
import pythonUniCoreApiFilesApi from './unicore-api/python/unicore-api/files-api.md'
import pythonUniCoreApiReadme from './unicore-api/python/unicore-api/README.md'
import pythonUniCoreApiStreaming from './unicore-api/python/unicore-api/streaming.md'
import pythonUniCoreApiToolUse from './unicore-api/python/unicore-api/tool-use.md'
import rubyUniCoreApi from './unicore-api/ruby/unicore-api.md'
import skillPrompt from './unicore-api/SKILL.md'
import sharedErrorCodes from './unicore-api/shared/error-codes.md'
import sharedLiveSources from './unicore-api/shared/live-sources.md'
import sharedModels from './unicore-api/shared/models.md'
import sharedPromptCaching from './unicore-api/shared/prompt-caching.md'
import sharedToolUseConcepts from './unicore-api/shared/tool-use-concepts.md'
import typescriptAgentSdkPatterns from './unicore-api/typescript/agent-sdk/patterns.md'
import typescriptAgentSdkReadme from './unicore-api/typescript/agent-sdk/README.md'
import typescriptUniCoreApiBatches from './unicore-api/typescript/unicore-api/batches.md'
import typescriptUniCoreApiFilesApi from './unicore-api/typescript/unicore-api/files-api.md'
import typescriptUniCoreApiReadme from './unicore-api/typescript/unicore-api/README.md'
import typescriptUniCoreApiStreaming from './unicore-api/typescript/unicore-api/streaming.md'
import typescriptUniCoreApiToolUse from './unicore-api/typescript/unicore-api/tool-use.md'

// @[MODEL LAUNCH]: Update the model IDs/names below. These are substituted into {{VAR}}
// placeholders in the .md files at runtime before the skill prompt is sent.
// After updating these constants, manually update the two files that still hardcode models:
//   - unicore-api/SKILL.md (Current Models pricing table)
//   - unicore-api/shared/models.md (full model catalog with legacy versions and alias mappings)
export const SKILL_MODEL_VARS = {
  OPUS_ID: 'unicore-opus-4-6',
  OPUS_NAME: 'UniCore Opus 4.6',
  SONNET_ID: 'unicore-sonnet-4-6',
  SONNET_NAME: 'UniCore Sonnet 4.6',
  HAIKU_ID: 'unicore-haiku-4-5',
  HAIKU_NAME: 'UniCore Haiku 4.5',
  // Previous Sonnet ID — used in "do not append date suffixes" example in SKILL.md.
  PREV_SONNET_ID: 'unicore-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT: string = skillPrompt

export const SKILL_FILES: Record<string, string> = {
  'csharp/unicore-api.md': csharpUniCoreApi,
  'curl/examples.md': curlExamples,
  'go/unicore-api.md': goUniCoreApi,
  'java/unicore-api.md': javaUniCoreApi,
  'php/unicore-api.md': phpUniCoreApi,
  'python/agent-sdk/README.md': pythonAgentSdkReadme,
  'python/agent-sdk/patterns.md': pythonAgentSdkPatterns,
  'python/unicore-api/README.md': pythonUniCoreApiReadme,
  'python/unicore-api/batches.md': pythonUniCoreApiBatches,
  'python/unicore-api/files-api.md': pythonUniCoreApiFilesApi,
  'python/unicore-api/streaming.md': pythonUniCoreApiStreaming,
  'python/unicore-api/tool-use.md': pythonUniCoreApiToolUse,
  'ruby/unicore-api.md': rubyUniCoreApi,
  'shared/error-codes.md': sharedErrorCodes,
  'shared/live-sources.md': sharedLiveSources,
  'shared/models.md': sharedModels,
  'shared/prompt-caching.md': sharedPromptCaching,
  'shared/tool-use-concepts.md': sharedToolUseConcepts,
  'typescript/agent-sdk/README.md': typescriptAgentSdkReadme,
  'typescript/agent-sdk/patterns.md': typescriptAgentSdkPatterns,
  'typescript/unicore-api/README.md': typescriptUniCoreApiReadme,
  'typescript/unicore-api/batches.md': typescriptUniCoreApiBatches,
  'typescript/unicore-api/files-api.md': typescriptUniCoreApiFilesApi,
  'typescript/unicore-api/streaming.md': typescriptUniCoreApiStreaming,
  'typescript/unicore-api/tool-use.md': typescriptUniCoreApiToolUse,
}
