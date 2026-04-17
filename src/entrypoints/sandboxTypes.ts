
import { z } from 'zod/v4'

export interface SandboxFilesystemConfig {
  root: string;
  readOnly?: boolean;
}

export interface SandboxIgnoreViolations {
  patterns: string[];
}

export interface SandboxNetworkConfig {
  mode: 'none' | 'local' | 'full';
  allowlist?: string[];
}

export interface SandboxSettings {
  filesystem: SandboxFilesystemConfig;
  network: SandboxNetworkConfig;
  ignoreViolations?: SandboxIgnoreViolations;
  // Backward compatible legacy fields
  enabled?: boolean;
  mode?: 'read-only' | 'workspace-write' | 'danger-full-access' | 'off';
  allowUnsandboxedCommands?: string[];
}

export function SandboxSettingsSchema() {
  return z
    .object({
      filesystem: z
        .object({
          root: z.string(),
          readOnly: z.boolean().optional(),
        })
        .optional(),
      network: z
        .object({
          mode: z.enum(['none', 'local', 'full']),
          allowlist: z.array(z.string()).optional(),
        })
        .optional(),
      ignoreViolations: z
        .object({
          patterns: z.array(z.string()),
        })
        .optional(),
      enabled: z.boolean().optional(),
      mode: z
        .enum(['read-only', 'workspace-write', 'danger-full-access', 'off'])
        .optional(),
      allowUnsandboxedCommands: z.array(z.string()).optional(),
    })
    .passthrough();
}
