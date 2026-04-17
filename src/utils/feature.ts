import { isEnvTruthy } from './envUtils.js';

const ENABLED_FEATURES = new Set([
  'AUTO_THEME',
  'AGENT_TRIGGERS',
  'DAEMON',
  'BREAK_CACHE_COMMAND',
  'BUILTIN_EXPLORE_PLAN_AGENTS',
  'FORK_SUBAGENT',
  'VOICE_MODE',
  'PROACTIVE',
  'UDS_INBOX',
  'WORKFLOW_SCRIPTS',
  'HISTORY_SNIP',
  'TERMINAL_PANEL',
  'WEB_BROWSER_TOOL',
  'MONITOR_TOOL',
  'KAIROS_GITHUB_WEBHOOKS',
  'KAIROS_BRIEF',
  'BRIDGE_MODE',
  'CCR_REMOTE_SETUP',
  'ULTRAPLAN',
  'TRANSCRIPT_CLASSIFIER',
  'COORDINATOR_MODE',
  'CONTEXT_COLLAPSE',
  'PROMPT_CACHE_BREAK_DETECTION',
  'REACTIVE_COMPACT',
  'EXTRACT_MEMORIES',
  'AUTO_DREAM',
  'BASH_CLASSIFIER',
  'BUDDY',
]);

/**
 * Registry for all available feature flags.
 * Combined with environment variables for runtime flexibility.
 */
export function feature(name: string): boolean {
  // 1. Check for explicit environment override: UNICORE_FEATURE_${NAME}=true/false
  const envVar = `UNICORE_FEATURE_${name}`;
  if (process.env[envVar] !== undefined) {
    return isEnvTruthy(process.env[envVar]);
  }

  // 2. Check for Anthropic-style environment indicators
  if (name === 'EXTERNAL_BUILD') {
     return process.env.USER_TYPE !== 'ant';
  }

  // 3. Return from managed set
  return ENABLED_FEATURES.has(name);
}

// Global injection for compatibility with legacy calls or Bun-style macros
if (typeof globalThis !== 'undefined') {
  (globalThis as any).feature = feature;
}
