const EXTERNAL_DISABLED_FEATURES = [
  "ABLATION_BASELINE",
  "AGENT_MEMORY_SNAPSHOT",
  "AGENT_TRIGGERS",
  "AGENT_TRIGGERS_REMOTE",
  "ALLOW_TEST_VERSIONS",
  "ANTI_DISTILLATION_CC",
  "AWAY_SUMMARY",
  "BASH_CLASSIFIER",
  "BG_SESSIONS",
  "BRIDGE_MODE",
  "BUDDY", // Keeping this off initially to solve core blockers, can enable later
  "BUILDING_CLAUDE_APPS",
  "BYOC_ENVIRONMENT_RUNNER",
  "CACHED_MICROCOMPACT",
  "CCR_AUTO_CONNECT",
  "CCR_MIRROR",
  "CCR_REMOTE_SETUP",
  "CHICAGO_MCP",
  "COMMIT_ATTRIBUTION",
  "COMPACTION_REMINDERS",
  "CONNECTOR_TEXT",
  "CONTEXT_COLLAPSE",
  "COORDINATOR_MODE",
  "COWORKER_TYPE_TELEMETRY",
  "DAEMON",
  "DIRECT_CONNECT",
  "DOWNLOAD_USER_SETTINGS",
  "DUMP_SYSTEM_PROMPT",
  "ENHANCED_TELEMETRY_BETA",
  "LODESTONE",
  "MCP_RICH_OUTPUT",
  "MEMORY_SHAPE_TELEMETRY",
  "MESSAGE_ACTIONS",
  "MONITOR_TOOL",
  "NATIVE_CLIENT_ATTESTATION",
  "NATIVE_CLIPBOARD_IMAGE",
  "NEW_INIT",
  "OVERFLOW_TEST_TOOL",
  "PERFETTO_TRACING",
  "POWERSHELL_AUTO_MODE",
  "PROACTIVE",
  "PROMPT_CACHE_BREAK_DETECTION",
  "QUICK_SEARCH",
  "REACTIVE_COMPACT",
  "REVIEW_ARTIFACT",
  "RUN_SKILL_GENERATOR",
  "SELF_HOSTED_RUNNER",
  "SHOT_STATS",
  "SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED",
  "SKILL_IMPROVEMENT",
  "SLOW_OPERATION_LOGGING",
  "SSH_REMOTE",
  "STREAMLINED_OUTPUT",
  "TEAMMEM",
  "TEMPLATES",
  "TERMINAL_PANEL",
  "TOKEN_BUDGET",
  "TORCH",
  "TRANSCRIPT_CLASSIFIER",
  "TREE_SITTER_BASH",
  "TREE_SITTER_BASH_SHADOW",
  "UDS_INBOX",
  "ULTRAPLAN",
  "ULTRATHINK",
  "UNATTENDED_RETRY",
  "UPLOAD_USER_SETTINGS",
  "VERIFICATION_AGENT",
  "VOICE_MODE",
  "WEB_BROWSER_TOOL",
  "WORKFLOW_SCRIPTS",
] as const;

const ENABLED_FEATURES = [
  "AUTO_THEME",
  "BREAK_CACHE_COMMAND",
  "BUILTIN_EXPLORE_PLAN_AGENTS",
  "FORK_SUBAGENT",
  "KAIROS",
  "MCP_SKILLS",
  "EXPERIMENTAL_SKILL_SEARCH",
] as const;

const featureModuleCode = `
export function feature(name) {
  const ENABLED = ${JSON.stringify(Array.from(ENABLED_FEATURES))};
  return ENABLED.includes(name);
}
`;

import pkg from "../package.json";
const version = process.env.CLI_VERSION || pkg.version;

import { existsSync } from "node:fs";
import { join, extname } from "node:path";

const fallbackShimPlugin = {
  name: "fallback-shim",
  setup(build: any) {
    const missingModules = new Map<string, number>();

    build.onResolve({ filter: /^react\/compiler-runtime$/ }, () => ({
      path: "react/compiler-runtime",
      namespace: "react-compiler-runtime-shim",
    }));
    build.onLoad(
      { filter: /.*/, namespace: "react-compiler-runtime-shim" },
      () => ({
        contents: `
import React from 'react';
const SENTINEL = Symbol.for("react.memo_cache_sentinel");
export function c(size) {
  try {
    const dispatcher = React?.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?.H;
    const cache = dispatcher?.useMemoCache?.(size);
    if (Array.isArray(cache)) {
      for (let i = 0; i < cache.length; i++) {
        if (cache[i] === undefined) cache[i] = SENTINEL;
      }
      return cache;
    }
  } catch {}
  return Array(size).fill(SENTINEL);
}
`,
        loader: "js",
      }),
    );

    build.onResolve({ filter: /^\./ }, (args: any) => {
      const { path, resolveDir } = args;
      const fullPath = join(resolveDir, path);
      
      // If it ends in .js, try .ts or .tsx first before giving up
      if (path.endsWith(".js")) {
        const base = fullPath.slice(0, -3);
        if (existsSync(base + ".ts")) return { path: base + ".ts" };
        if (existsSync(base + ".tsx")) return { path: base + ".tsx" };
      }

      // If it doesn't exist as specified, and it's not a known extension, try shimming
      if (!existsSync(fullPath) && !existsSync(fullPath + ".ts") && !existsSync(fullPath + ".tsx") && !existsSync(fullPath + ".js")) {
        const key = `${path}@@${resolveDir}`;
        missingModules.set(key, (missingModules.get(key) ?? 0) + 1);
        return {
          path: path,
          namespace: "fallback-shim",
        };
      }
      return null;
    });

    build.onLoad({ filter: /.*/, namespace: "fallback-shim" }, () => ({
      contents: "export default {}; export const c = (size) => []; export const buildPRTrailers = () => '';",
      loader: "js",
    }));

    build.onEnd(() => {
      if (missingModules.size === 0) return;
      const verbose = ["1", "true", "yes", "on", "all"].includes(
        String(process.env.SHIM_VERBOSE ?? "").toLowerCase(),
      );
      if (!verbose) {
        console.warn(
          `[Shim] Missing modules patched: ${missingModules.size} (set SHIM_VERBOSE=1 for details)`,
        );
        return;
      }
      console.warn(`[Shim] Missing modules patched: ${missingModules.size}`);
      const showAll = String(process.env.SHIM_VERBOSE ?? "").toLowerCase() === "all";
      const entries = Array.from(missingModules.entries());
      const shownEntries = showAll ? entries : entries.slice(0, 20);
      for (const [key] of shownEntries) {
        const [mod, dir] = key.split("@@");
        console.warn(`  - ${mod} in ${dir}`);
      }
      if (!showAll && missingModules.size > 20) {
        console.warn(`  ... and ${missingModules.size - 20} more`);
      }
    });
  },
};

const bunBundlePlugin = {
  name: "bun-bundle-shim",
  setup(build: any) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => ({
      path: "bun:bundle",
      namespace: "bun-bundle-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "bun-bundle-shim" }, () => ({
      contents: featureModuleCode,
      loader: "js",
    }));
  },
};

const result = await Bun.build({
  entrypoints: ["./src/entrypoints/cli.tsx"],
  outdir: "./dist",
  target: "bun",
  format: "esm",
  sourcemap: "linked",
  minify: false,
  plugins: [bunBundlePlugin, fallbackShimPlugin],
  define: {
    "MACRO.VERSION": JSON.stringify(version),
    "MACRO.BUILD_TIME": JSON.stringify(new Date().toISOString()),
    "MACRO.PACKAGE_URL": JSON.stringify("https://unicore-ai.com"),
    "MACRO.NATIVE_PACKAGE_URL": JSON.stringify(""),
    "MACRO.VERSION_CHANGELOG": JSON.stringify(""),
    "MACRO.FEEDBACK_CHANNEL": JSON.stringify(""),
    "MACRO.ISSUES_EXPLAINER": JSON.stringify("https://github.com/Koriginal/unicore/issues"),
  },
  loader: {
    ".md": "text",
  },
  external: [
    "@anthropic-ai/bedrock-sdk",
    "@anthropic-ai/foundry-sdk",
    "@anthropic-ai/vertex-sdk",
    "@anthropic-ai/sandbox-runtime",
    "@anthropic-ai/mcpb",
    "@anthropic-ai/bedrock-sdk",
    "@anthropic-ai/foundry-sdk",
    "@anthropic-ai/vertex-sdk",
    "@anthropic-ai/sandbox-runtime",
    "@anthropic-ai/mcpb",
    "@ant/unicore-for-chrome-mcp",
    "@anthropic-ai/claude-agent-sdk",
    "@ant/computer-use-mcp",
    "@ant/computer-use-swift",
    "@ant/computer-use-input",
    "@ant/claude-for-chrome-mcp",
    "audio-capture-napi",
    "color-diff-napi",
    "image-processor-napi",
    "modifiers-napi",
    "url-handler-napi",
    "sharp",
    "bun:ffi",
    "@aws-sdk/client-bedrock",
    "@aws-sdk/client-bedrock-runtime",
    "@aws-sdk/client-sts",
    "@aws-sdk/credential-providers",
    "@smithy/core",
    "@smithy/node-http-handler",
    "@azure/identity",
    "google-auth-library",
    "zod",
  ],
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Build succeeded: ${result.outputs.length} output(s)`);
for (const output of result.outputs) {
  console.log(`  ${output.path} (${output.kind})`);
}
