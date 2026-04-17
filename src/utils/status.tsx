import chalk from 'chalk';
import figures from 'figures';
import * as React from 'react';
import { color, Text } from '../ink.js';
import type { MCPServerConnection } from '../services/mcp/types.js';
import {
  getAccountInformation,
  getUniAIApiKeyWithSource,
  isUniCoreAISubscriber
} from './auth.js';
import { getLargeMemoryFiles, getMemoryFiles, MAX_MEMORY_CHARACTER_COUNT } from './unicoremd.js';
import { getDoctorDiagnostic } from './doctorDiagnostic.js';
import { getAWSRegion, getDefaultVertexRegion, isEnvTruthy } from './envUtils.js';
import { getDisplayPath } from './file.js';
import { formatNumber } from './format.js';
import { getIdeClientName, type IDEExtensionInstallationStatus, isJetBrainsIde, toIDEDisplayName } from './ide.js';
import { getUniCoreAiUserDefaultModelDescription, modelDisplayString } from './model/model.js';
import {
  getCompatProviderProfile,
  getAPIProvider,
  getConfiguredUniAIBaseUrl,
  getConfiguredUniAIBaseUrlSource,
  isFirstPartyUniAIBaseUrl,
  renderCompatProviderProfile,
  shouldUseBearerAuthForCompatGateway
} from './model/providers.js';
import { isModelRouterEnabled } from './model/router.js';
import { getMTLSConfig } from './mtls.js';
import { checkInstall } from './nativeInstaller/index.js';
import { getProxyUrl } from './proxy.js';
import { SandboxManager } from './sandbox/sandbox-adapter.js';
import { getSettingsWithAllErrors } from './settings/allErrors.js';
import { getEnabledSettingSources, getSettingSourceDisplayNameCapitalized } from './settings/constants.js';
import { getManagedFileSettingsPresence, getPolicySettingsOrigin, getSettingsForSource } from './settings/settings.js';
import type { ThemeName } from './theme.js';
export type Property = {
  label?: string;
  value: React.ReactNode | Array<string>;
};
export type Diagnostic = React.ReactNode;
export function buildSandboxProperties(): Property[] {
  if ("external" !== 'ant') {
    return [];
  }
  const isSandboxed = SandboxManager.isSandboxingEnabled();
  return [{
    label: 'Bash Sandbox',
    value: isSandboxed ? 'Enabled' : 'Disabled'
  }];
}
export function buildIDEProperties(mcpClients: MCPServerConnection[], ideInstallationStatus: IDEExtensionInstallationStatus | null = null, theme: ThemeName): Property[] {
  const ideClient = mcpClients?.find(client => client.name === 'ide');
  if (ideInstallationStatus) {
    const ideName = toIDEDisplayName(ideInstallationStatus.ideType);
    const pluginOrExtension = isJetBrainsIde(ideInstallationStatus.ideType) ? 'plugin' : 'extension';
    if (ideInstallationStatus.error) {
      return [{
        label: 'IDE',
        value: <Text>
              {color('error', theme)(figures.cross)} Error installing {ideName}{' '}
              {pluginOrExtension}: {ideInstallationStatus.error}
              {'\n'}Please restart your IDE and try again.
            </Text>
      }];
    }
    if (ideInstallationStatus.installed) {
      if (ideClient && ideClient.type === 'connected') {
        if (ideInstallationStatus.installedVersion !== ideClient.serverInfo?.version) {
          return [{
            label: 'IDE',
            value: `Connected to ${ideName} ${pluginOrExtension} version ${ideInstallationStatus.installedVersion} (server version: ${ideClient.serverInfo?.version})`
          }];
        } else {
          return [{
            label: 'IDE',
            value: `Connected to ${ideName} ${pluginOrExtension} version ${ideInstallationStatus.installedVersion}`
          }];
        }
      } else {
        return [{
          label: 'IDE',
          value: `Installed ${ideName} ${pluginOrExtension}`
        }];
      }
    }
  } else if (ideClient) {
    const ideName = getIdeClientName(ideClient) ?? 'IDE';
    if (ideClient.type === 'connected') {
      return [{
        label: 'IDE',
        value: `Connected to ${ideName} extension`
      }];
    } else {
      return [{
        label: 'IDE',
        value: `${color('error', theme)(figures.cross)} Not connected to ${ideName}`
      }];
    }
  }
  return [];
}
export function buildMcpProperties(clients: MCPServerConnection[] = [], theme: ThemeName): Property[] {
  const servers = clients.filter(client => client.name !== 'ide');
  if (!servers.length) {
    return [];
  }

  // Summary instead of a full server list — 20+ servers wrapped onto many
  // rows, dominating the Status pane. Show counts by state + /mcp hint.
  const byState = {
    connected: 0,
    pending: 0,
    needsAuth: 0,
    failed: 0
  };
  for (const s of servers) {
    if (s.type === 'connected') byState.connected++;else if (s.type === 'pending') byState.pending++;else if (s.type === 'needs-auth') byState.needsAuth++;else byState.failed++;
  }
  const parts: string[] = [];
  if (byState.connected) parts.push(color('success', theme)(`${byState.connected} connected`));
  if (byState.needsAuth) parts.push(color('warning', theme)(`${byState.needsAuth} need auth`));
  if (byState.pending) parts.push(color('inactive', theme)(`${byState.pending} pending`));
  if (byState.failed) parts.push(color('error', theme)(`${byState.failed} failed`));
  return [{
    label: 'MCP servers',
    value: `${parts.join(', ')} ${color('inactive', theme)('· /mcp')}`
  }];
}
export async function buildMemoryDiagnostics(): Promise<Diagnostic[]> {
  const files = await getMemoryFiles();
  const largeFiles = getLargeMemoryFiles(files);
  const diagnostics: Diagnostic[] = [];
  largeFiles.forEach(file => {
    const displayPath = getDisplayPath(file.path);
    diagnostics.push(`Large ${displayPath} will impact performance (${formatNumber(file.content.length)} chars > ${formatNumber(MAX_MEMORY_CHARACTER_COUNT)})`);
  });
  return diagnostics;
}
export function buildSettingSourcesProperties(): Property[] {
  const enabledSources = getEnabledSettingSources();

  // Filter to only sources that actually have settings loaded
  const sourcesWithSettings = enabledSources.filter(source => {
    const settings = getSettingsForSource(source);
    return settings !== null && Object.keys(settings).length > 0;
  });

  // Map internal names to user-friendly names
  // For policySettings, distinguish between remote and local (or skip if neither exists)
  const sourceNames = sourcesWithSettings.map(source => {
    if (source === 'policySettings') {
      const origin = getPolicySettingsOrigin();
      if (origin === null) {
        return null; // Skip - no policy settings exist
      }
      switch (origin) {
        case 'remote':
          return 'Enterprise managed settings (remote)';
        case 'plist':
          return 'Enterprise managed settings (plist)';
        case 'hklm':
          return 'Enterprise managed settings (HKLM)';
        case 'file':
          {
            const {
              hasBase,
              hasDropIns
            } = getManagedFileSettingsPresence();
            if (hasBase && hasDropIns) {
              return 'Enterprise managed settings (file + drop-ins)';
            }
            if (hasDropIns) {
              return 'Enterprise managed settings (drop-ins)';
            }
            return 'Enterprise managed settings (file)';
          }
        case 'hkcu':
          return 'Enterprise managed settings (HKCU)';
      }
    }
    return getSettingSourceDisplayNameCapitalized(source);
  }).filter((name): name is string => name !== null);
  return [{
    label: 'Setting sources',
    value: sourceNames
  }];
}
export async function buildInstallationDiagnostics(): Promise<Diagnostic[]> {
  const installWarnings = await checkInstall();
  return installWarnings.map(warning => warning.message);
}
export async function buildInstallationHealthDiagnostics(): Promise<Diagnostic[]> {
  const diagnostic = await getDoctorDiagnostic();
  const items: Diagnostic[] = [];
  const {
    errors: validationErrors
  } = getSettingsWithAllErrors();
  if (validationErrors.length > 0) {
    const invalidFiles = Array.from(new Set(validationErrors.map(error => error.file)));
    const fileList = invalidFiles.join(', ');
    items.push(`Found invalid settings files: ${fileList}. They will be ignored.`);
  }

  // Add warnings from doctor diagnostic (includes leftover installations, config mismatches, etc.)
  diagnostic.warnings.forEach(warning => {
    items.push(warning.issue);
  });
  if (diagnostic.hasUpdatePermissions === false) {
    items.push('No write permissions for auto-updates (requires sudo)');
  }
  return items;
}
export function buildAccountProperties(): Property[] {
  const accountInfo = getAccountInformation();
  if (!accountInfo) {
    return [];
  }
  const properties: Property[] = [];
  if (accountInfo.subscription) {
    properties.push({
      label: 'Login method',
      value: `${accountInfo.subscription} Account`
    });
  }
  if (accountInfo.tokenSource) {
    properties.push({
      label: 'Auth token',
      value: accountInfo.tokenSource
    });
  }
  if (accountInfo.apiKeySource) {
    properties.push({
      label: 'API key',
      value: accountInfo.apiKeySource
    });
  }

  // Hide sensitive account info in demo mode
  if (accountInfo.organization && !process.env.IS_DEMO) {
    properties.push({
      label: 'Organization',
      value: accountInfo.organization
    });
  }
  if (accountInfo.email && !process.env.IS_DEMO) {
    properties.push({
      label: 'Email',
      value: accountInfo.email
    });
  }
  return properties;
}
export function buildAPIProviderProperties(): Property[] {
  const apiProvider = getAPIProvider();
  const properties: Property[] = [];
  properties.push({
    label: 'Model router',
    value: isModelRouterEnabled() ? 'Enabled' : 'Disabled'
  });
  const routerProfile = process.env.UNICORE_MODEL_ROUTER_PROFILE?.trim();
  const routerAdaptive = process.env.UNICORE_MODEL_ROUTER_ADAPTIVE?.trim();
  const routerAdaptiveThreshold = process.env.UNICORE_MODEL_ROUTER_ADAPTIVE_TOKEN_THRESHOLD?.trim();
  const routerPolicyVersion = process.env.UNICORE_MODEL_ROUTER_POLICY_VERSION?.trim();
  const routerDisableTaskForce = process.env.UNICORE_MODEL_ROUTER_DISABLE_TASK_FORCE?.trim();
  if (routerProfile) {
    properties.push({
      label: 'Router profile',
      value: routerProfile
    });
  }
  if (routerAdaptive || routerAdaptiveThreshold) {
    properties.push({
      label: 'Router adaptive',
      value: [
        routerAdaptive ? `enabled=${routerAdaptive}` : 'enabled=0',
        routerAdaptiveThreshold ? `token_threshold=${routerAdaptiveThreshold}` : 'token_threshold=90000'
      ]
    });
  }
  if (routerPolicyVersion || routerDisableTaskForce) {
    properties.push({
      label: 'Router policy',
      value: [
        routerPolicyVersion ? `version=${routerPolicyVersion}` : 'version=v1',
        routerDisableTaskForce ? `disable_task_force=${routerDisableTaskForce}` : 'disable_task_force=0'
      ]
    });
  }
  const routerPlanModel = process.env.UNICORE_MODEL_ROUTER_PLAN?.trim();
  const routerReviewModel = process.env.UNICORE_MODEL_ROUTER_REVIEW?.trim();
  const routerBackgroundModel = process.env.UNICORE_MODEL_ROUTER_BACKGROUND?.trim();
  const routerCodingModel = process.env.UNICORE_MODEL_ROUTER_CODING?.trim();
  const routerPlanCandidates = process.env.UNICORE_MODEL_ROUTER_PLAN_CANDIDATES?.trim();
  const routerReviewCandidates = process.env.UNICORE_MODEL_ROUTER_REVIEW_CANDIDATES?.trim();
  const routerBackgroundCandidates = process.env.UNICORE_MODEL_ROUTER_BACKGROUND_CANDIDATES?.trim();
  const routerCodingCandidates = process.env.UNICORE_MODEL_ROUTER_CODING_CANDIDATES?.trim();
  const longContextCandidates = process.env.UNICORE_MODEL_ROUTER_LONG_CONTEXT_CANDIDATES?.trim();
  const longContextThreshold = process.env.UNICORE_MODEL_ROUTER_LONG_CONTEXT_THRESHOLD?.trim();
  if (routerPlanModel || routerReviewModel || routerBackgroundModel || routerCodingModel) {
    properties.push({
      label: 'Router overrides',
      value: [
        routerPlanModel ? `plan=${routerPlanModel}` : 'plan=default',
        routerReviewModel ? `review=${routerReviewModel}` : 'review=default',
        routerBackgroundModel ? `background=${routerBackgroundModel}` : 'background=default',
        routerCodingModel ? `coding=${routerCodingModel}` : 'coding=default'
      ]
    });
  }
  if (routerPlanCandidates || routerReviewCandidates || routerBackgroundCandidates || routerCodingCandidates) {
    properties.push({
      label: 'Router candidates',
      value: [
        routerPlanCandidates ? `plan=${routerPlanCandidates}` : 'plan=default',
        routerReviewCandidates ? `review=${routerReviewCandidates}` : 'review=default',
        routerBackgroundCandidates ? `background=${routerBackgroundCandidates}` : 'background=default',
        routerCodingCandidates ? `coding=${routerCodingCandidates}` : 'coding=default'
      ]
    });
  }
  if (longContextCandidates || longContextThreshold) {
    properties.push({
      label: 'Long-context routing',
      value: [
        longContextCandidates ? `candidates=${longContextCandidates}` : 'candidates=default',
        longContextThreshold ? `threshold=${longContextThreshold}` : 'threshold=120000'
      ]
    });
  }
  const requestedModel = process.env.ANTHROPIC_MODEL?.trim();
  if (requestedModel) {
    properties.push({
      label: 'Requested model',
      value: requestedModel
    });
  }
  const customModelOption = process.env.ANTHROPIC_CUSTOM_MODEL_OPTION?.trim();
  if (customModelOption) {
    properties.push({
      label: 'Custom model option',
      value: customModelOption
    });
  }
  if (apiProvider !== 'firstParty') {
    const providerLabel = {
      bedrock: 'AWS Bedrock',
      vertex: 'Google Vertex AI',
      foundry: 'Microsoft Foundry'
    }[apiProvider];
    properties.push({
      label: 'API provider',
      value: providerLabel
    });
  }
  if (apiProvider === 'firstParty') {
    const uniaiBaseUrl = getConfiguredUniAIBaseUrl();
    const baseUrlSource = getConfiguredUniAIBaseUrlSource();
    if (uniaiBaseUrl) {
      properties.push({
        label: 'UniAI base URL',
        value: uniaiBaseUrl
      });
      if (baseUrlSource) {
        properties.push({
          label: 'Base URL source',
          value: baseUrlSource
        });
      }
      if (!isFirstPartyUniAIBaseUrl()) {
        properties.push({
          label: 'API provider',
          value: 'Anthropic-compatible gateway'
        });
        const compatProfile = getCompatProviderProfile();
        if (compatProfile) {
          properties.push({
            label: 'Gateway profile',
            value: renderCompatProviderProfile(compatProfile)
          });
          properties.push({
            label: 'Gateway auth mode',
            value: shouldUseBearerAuthForCompatGateway() ? 'Bearer token' : 'x-api-key / gateway-native'
          });
        }
        const { source: apiKeySource } = getUniAIApiKeyWithSource({
          skipRetrievingKeyFromApiKeyHelper: true
        });
        const hasGatewayAuth = Boolean(
          process.env.UNICORE_AUTH_TOKEN ||
          process.env.UNICORE_COMPAT_API_KEY ||
          apiKeySource !== 'none'
        );
        properties.push({
          label: 'Gateway auth',
          value: hasGatewayAuth ? 'Configured' : 'Missing (set UNICORE_API_KEY or UNICORE_COMPAT_API_KEY)'
        });
      }
    }
  } else if (apiProvider === 'bedrock') {
    const bedrockBaseUrl = process.env.BEDROCK_BASE_URL;
    if (bedrockBaseUrl) {
      properties.push({
        label: 'Bedrock base URL',
        value: bedrockBaseUrl
      });
    }
    properties.push({
      label: 'AWS region',
      value: getAWSRegion()
    });
    if (isEnvTruthy(process.env.UNICORE_CODE_SKIP_BEDROCK_AUTH)) {
      properties.push({
        value: 'AWS auth skipped'
      });
    }
  } else if (apiProvider === 'vertex') {
    const vertexBaseUrl = process.env.VERTEX_BASE_URL;
    if (vertexBaseUrl) {
      properties.push({
        label: 'Vertex base URL',
        value: vertexBaseUrl
      });
    }
    const gcpProject = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
    if (gcpProject) {
      properties.push({
        label: 'GCP project',
        value: gcpProject
      });
    }
    properties.push({
      label: 'Default region',
      value: getDefaultVertexRegion()
    });
    if (isEnvTruthy(process.env.UNICORE_CODE_SKIP_VERTEX_AUTH)) {
      properties.push({
        value: 'GCP auth skipped'
      });
    }
  } else if (apiProvider === 'foundry') {
    const foundryBaseUrl = process.env.ANTHROPIC_FOUNDRY_BASE_URL;
    if (foundryBaseUrl) {
      properties.push({
        label: 'Microsoft Foundry base URL',
        value: foundryBaseUrl
      });
    }
    const foundryResource = process.env.ANTHROPIC_FOUNDRY_RESOURCE;
    if (foundryResource) {
      properties.push({
        label: 'Microsoft Foundry resource',
        value: foundryResource
      });
    }
    if (isEnvTruthy(process.env.UNICORE_CODE_SKIP_FOUNDRY_AUTH)) {
      properties.push({
        value: 'Microsoft Foundry auth skipped'
      });
    }
  }
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    properties.push({
      label: 'Proxy',
      value: proxyUrl
    });
  }
  const mtlsConfig = getMTLSConfig();
  if (process.env.NODE_EXTRA_CA_CERTS) {
    properties.push({
      label: 'Additional CA cert(s)',
      value: process.env.NODE_EXTRA_CA_CERTS
    });
  }
  if (mtlsConfig) {
    if (mtlsConfig.cert && process.env.UNICORE_CODE_CLIENT_CERT) {
      properties.push({
        label: 'mTLS client cert',
        value: process.env.UNICORE_CODE_CLIENT_CERT
      });
    }
    if (mtlsConfig.key && process.env.UNICORE_CODE_CLIENT_KEY) {
      properties.push({
        label: 'mTLS client key',
        value: process.env.UNICORE_CODE_CLIENT_KEY
      });
    }
  }
  return properties;
}
export function getModelDisplayLabel(mainLoopModel: string | null): string {
  let modelLabel = modelDisplayString(mainLoopModel);
  if (mainLoopModel === null && isUniCoreAISubscriber()) {
    const description = getUniCoreAiUserDefaultModelDescription();
    modelLabel = `${chalk.bold('Default')} ${description}`;
  }
  return modelLabel;
}
