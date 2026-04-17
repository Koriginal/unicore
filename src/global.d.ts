declare global {
  const MACRO: {
    VERSION: string;
    BUILD_TIME: string;
    FEEDBACK_CHANNEL: string;
    ISSUES_EXPLAINER: string;
    NATIVE_PACKAGE_URL: string;
    PACKAGE_URL: string;
    VERSION_CHANGELOG: string;
  };

  /**
   * Bun-specific bundle features.
   */
  function feature(name: string): boolean;

  namespace NodeJS {
    interface ProcessEnv {
      UNICORE_BASE_URL?: string;
      UNICORE_COMPAT_BASE_URL?: string;
      UNICORE_COMPAT_API_KEY?: string;
      UNICORE_COMPAT_PROVIDER?: string;
      UNICORE_MODEL_PROVIDER?: string;
      UNICORE_COMPAT_USE_BEARER_AUTH?: string;
      UNICORE_MODEL_ROUTER_ENABLED?: string;
      UNICORE_MODEL_ROUTER_PROFILE?: string;
      UNICORE_MODEL_ROUTER_ADAPTIVE?: string;
      UNICORE_MODEL_ROUTER_ADAPTIVE_TOKEN_THRESHOLD?: string;
      UNICORE_MODEL_ROUTER_POLICY_VERSION?: string;
      UNICORE_MODEL_ROUTER_DISABLE_TASK_FORCE?: string;
      UNICORE_MODEL_ROUTER_PLAN?: string;
      UNICORE_MODEL_ROUTER_REVIEW?: string;
      UNICORE_MODEL_ROUTER_BACKGROUND?: string;
      UNICORE_MODEL_ROUTER_CODING?: string;
      UNICORE_MODEL_ROUTER_PLAN_CANDIDATES?: string;
      UNICORE_MODEL_ROUTER_REVIEW_CANDIDATES?: string;
      UNICORE_MODEL_ROUTER_BACKGROUND_CANDIDATES?: string;
      UNICORE_MODEL_ROUTER_CODING_CANDIDATES?: string;
      UNICORE_MODEL_ROUTER_LONG_CONTEXT_CANDIDATES?: string;
      UNICORE_MODEL_ROUTER_LONG_CONTEXT_THRESHOLD?: string;
      UNICORECODE?: string;
      UNICORE_CONFIG_DIR?: string;
      USER_TYPE?: 'ant' | 'external';
      // Add other environment variables as needed
    }
  }
}

export {};
