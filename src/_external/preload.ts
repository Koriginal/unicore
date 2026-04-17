import { plugin } from "bun";

import pkg from "../../package.json";
const version = process.env.CLI_VERSION || pkg.version;

(globalThis as any).MACRO = {
  VERSION: version,
  BUILD_TIME: new Date().toISOString(),
  PACKAGE_URL: "https://unicore-ai.com",
  NATIVE_PACKAGE_URL: "",
  VERSION_CHANGELOG: "",
  FEEDBACK_CHANNEL: "",
  ISSUES_EXPLAINER: "https://github.com/Koriginal/unicore/issues",
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
