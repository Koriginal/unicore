import { plugin } from "bun";

const version = process.env.CLI_VERSION || "0.1.0-unicore";

(globalThis as any).MACRO = {
  VERSION: version,
  BUILD_TIME: new Date().toISOString(),
  PACKAGE_URL: "https://unicore-ai.com",
  NATIVE_PACKAGE_URL: "",
  VERSION_CHANGELOG: "",
  FEEDBACK_CHANNEL: "",
  ISSUES_EXPLAINER: "https://github.com/dsai/unicore/issues",
};

plugin({
  name: "bun-bundle-shim",
  setup(build) {
    build.module("bun:bundle", () => {
      return {
        exports: {
          feature: (_name: string): boolean => {
            // Default to limited features for raw run
            const enabled = ["AUTO_THEME", "BREAK_CACHE_COMMAND", "BUILTIN_EXPLORE_PLAN_AGENTS", "FORK_SUBAGENT"];
            return enabled.includes(_name);
          },
        },
        loader: "object",
      };
    });
  },
});
