import * as React from 'react'
import { resolve } from 'path'
import { setOriginalCwd, setProjectRoot } from '../../bootstrap/state.js'
import type { CommandResultDisplay } from '../../commands.js'
import type { OptionWithDescription } from '../../components/CustomSelect/select.js'
import { Select } from '../../components/CustomSelect/select.js'
import { Dialog } from '../../components/design-system/Dialog.js'
import { PromptInputFooterSuggestions, type SuggestionItem } from '../../components/PromptInput/PromptInputFooterSuggestions.js'
import TextInput from '../../components/TextInput.js'
import { Box, Text } from '../../ink.js'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { getDisplayPath } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { formatRelativeTimeAgo } from '../../utils/format.js'
import { recordRecentProject, getRecentProjects } from '../../utils/recentProjects.js'
import { setCwd } from '../../utils/Shell.js'
import { getDirectoryCompletions } from '../../utils/suggestions/directoryCompletion.js'
import { clearMemoryFileCaches } from '../../utils/unicoremd.js'
import { updateHooksConfigSnapshot } from '../../utils/hooks/hooksConfigSnapshot.js'
import { SandboxManager } from '../../utils/sandbox/sandbox-adapter.js'
import { loadAllProjectsMessageLogs } from '../../utils/sessionStorage.js'

type Candidate = {
  path: string
  source: 'recent' | 'history'
  lastUsedAt?: number
}

type Props = {
  args: string
  onDone: (
    result?: string,
    options?: {
      display?: CommandResultDisplay
    },
  ) => void
}

function ensureSwitchableProject(path: string): string {
  const fs = getFsImplementation()
  const target = resolve(path).normalize('NFC')
  if (!fs.existsSync(target)) {
    throw new Error(`Project path does not exist: ${target}`)
  }
  if (!fs.statSync(target).isDirectory()) {
    throw new Error(`Target is not a directory: ${target}`)
  }
  return target
}

function switchProject(path: string): string {
  const target = ensureSwitchableProject(path)
  process.chdir(target)
  setCwd(target)
  setOriginalCwd(target)
  setProjectRoot(target)
  clearMemoryFileCaches()
  updateHooksConfigSnapshot()
  SandboxManager.refreshConfig()
  recordRecentProject(target)
  return target
}

async function buildCandidates(): Promise<Candidate[]> {
  const fromConfig: Candidate[] = getRecentProjects(12).map(item => ({
    path: item.path,
    source: 'recent',
    lastUsedAt: item.lastUsedAt,
  }))

  const logs = await loadAllProjectsMessageLogs(80)
  const fromLogs: Candidate[] = logs
    .map(log => ({
      path: log.projectPath || '',
      source: 'history' as const,
      lastUsedAt: log.modified?.getTime?.(),
    }))
    .filter(item => item.path)

  const merged = new Map<string, Candidate>()
  for (const item of [...fromConfig, ...fromLogs]) {
    let normalized = ''
    try {
      normalized = ensureSwitchableProject(item.path)
    } catch {
      continue
    }
    const prev = merged.get(normalized)
    if (!prev || (item.lastUsedAt || 0) > (prev.lastUsedAt || 0)) {
      merged.set(normalized, {
        path: normalized,
        source: prev?.source === 'recent' || item.source === 'recent' ? 'recent' : item.source,
        lastUsedAt: item.lastUsedAt || prev?.lastUsedAt,
      })
    }
  }

  return [...merged.values()]
    .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
    .slice(0, 12)
}

function ProjectSwitcher({ args, onDone }: Props): React.ReactNode {
  const [candidates, setCandidates] = React.useState<Candidate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [notice, setNotice] = React.useState<string>(
    args.trim() ? `Ignored extra args for /project: "${args.trim()}".` : '',
  )
  const [customPath, setCustomPath] = React.useState('')
  const [mode, setMode] = React.useState<'select' | 'manual'>('select')
  const [suggestions, setSuggestions] = React.useState<SuggestionItem[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = React.useState(0)

  const reload = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await buildCandidates()
      setCandidates(result)
      if (result.length === 0) {
        setNotice(
          'No recent project detected yet. Type a path below to switch project.',
        )
      }
    } catch (error) {
      setNotice(
        `Failed to load project history: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void reload()
  }, [reload])

  React.useEffect(() => {
    if (mode !== 'manual') return
    let cancelled = false
    const run = async () => {
      const result = await getDirectoryCompletions(customPath, {
        maxResults: 8,
      })
      if (cancelled) return
      setSuggestions(result)
      setSelectedSuggestion(0)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [customPath, mode])

  const options: OptionWithDescription<string>[] = [
    ...candidates.map(item => ({
      value: `path:${item.path}`,
      label: getDisplayPath(item.path),
      description: `${item.source === 'recent' ? 'recent' : 'history'}${
        item.lastUsedAt
          ? ` · ${formatRelativeTimeAgo(new Date(item.lastUsedAt))}`
          : ''
      }`,
    })),
    {
      value: 'use-current-dir',
      label: 'use current terminal directory',
      description: process.cwd(),
    },
    {
      value: 'manual-path',
      label: 'enter custom path',
      description: 'Open dedicated path input dialog',
    },
    {
      value: 'reload',
      label: loading ? 'reloading...' : 'refresh list',
      disabled: loading,
    },
    {
      value: 'cancel',
      label: 'cancel',
    },
  ]

  function finishWithSwitch(targetPath: string): void {
    try {
      const switched = switchProject(targetPath)
      onDone(
        `Switched project to ${switched}

You can now start coding directly in this workspace.`,
        { display: 'system' },
      )
    } catch (error) {
      setNotice(
        `Switch failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  function handleChange(value: string): void {
    if (value === 'cancel') {
      onDone('Project switch cancelled.', { display: 'system' })
      return
    }
    if (value === 'reload') {
      void reload()
      return
    }
    if (value === 'use-current-dir') {
      finishWithSwitch(process.cwd())
      return
    }
    if (value === 'manual-path') {
      setMode('manual')
      setNotice('')
      return
    }
    if (value.startsWith('path:')) {
      finishWithSwitch(value.slice('path:'.length))
    }
  }

  if (mode === 'manual') {
    const applySuggestion = (item: SuggestionItem): void => {
      if (!item?.id) return
      setCustomPath(item.id.endsWith('/') ? item.id : `${item.id}/`)
      setNotice('')
    }

    const submitPath = (value: string): void => {
      const trimmed = value.trim()
      if (!trimmed) {
        setNotice('Please enter a valid project path.')
        return
      }
      finishWithSwitch(trimmed)
    }

    const handleManualKeyDown = (e: KeyboardEvent): void => {
      if (suggestions.length === 0) return
      if (e.key === 'tab') {
        e.preventDefault()
        const picked = suggestions[selectedSuggestion]
        if (picked) applySuggestion(picked)
        return
      }
      if (e.key === 'up' || (e.ctrl && e.key === 'p')) {
        e.preventDefault()
        setSelectedSuggestion(prev =>
          prev <= 0 ? suggestions.length - 1 : prev - 1,
        )
        return
      }
      if (e.key === 'down' || (e.ctrl && e.key === 'n')) {
        e.preventDefault()
        setSelectedSuggestion(prev =>
          prev >= suggestions.length - 1 ? 0 : prev + 1,
        )
        return
      }
      if (e.key === 'return') {
        const picked = suggestions[selectedSuggestion]
        if (picked) {
          e.preventDefault()
          applySuggestion(picked)
        }
      }
    }

    return (
      <Dialog
        title="Custom Project Path"
        subtitle="Paste or type an absolute path, then press Enter"
        onCancel={() => {
          setMode('select')
        }}
        color="permission"
      >
        <Box
          flexDirection="column"
          tabIndex={0}
          autoFocus={true}
          onKeyDown={handleManualKeyDown}
        >
          {notice ? <Text color="warning">{notice}</Text> : null}
          <Box borderStyle="round" borderColor="border" paddingLeft={1}>
            <TextInput
              value={customPath}
              onChange={setCustomPath}
              onSubmit={submitPath}
              onExit={() => {
                setMode('select')
              }}
              placeholder="/absolute/path/to/project"
              focus={true}
              showCursor={true}
              cursorOffset={customPath.length}
              onChangeCursorOffset={() => {}}
              columns={100}
            />
          </Box>
          {suggestions.length > 0 ? (
            <Box marginTop={1}>
              <PromptInputFooterSuggestions
                suggestions={suggestions}
                selectedSuggestion={selectedSuggestion}
              />
            </Box>
          ) : null}
          <Text dimColor>
            Tip: press Tab to autocomplete path; Enter submits.
          </Text>
        </Box>
      </Dialog>
    )
  }

  return (
    <Dialog
      title="Project Switcher"
      subtitle="Pick a recent project or input a custom path"
      onCancel={() => onDone('Project switch cancelled.', { display: 'system' })}
      color="permission"
    >
      <Box flexDirection="column">
        {notice ? <Text color="warning">{notice}</Text> : null}
        <Select options={options} onChange={handleChange} />
      </Box>
    </Dialog>
  )
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const trimmed = args.trim()
  if (trimmed) {
    try {
      const switched = switchProject(trimmed)
      onDone(
        `Switched project to ${switched}

You can now start coding directly in this workspace.`,
        { display: 'system' },
      )
    } catch (error) {
      onDone(
        `Project switch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { display: 'system' },
      )
    }
    return null
  }

  return <ProjectSwitcher args={args} onDone={onDone} />
}
