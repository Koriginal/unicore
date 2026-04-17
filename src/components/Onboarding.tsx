import { c as _c } from "react/compiler-runtime";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from 'src/services/analytics/index.js';
import { setupTerminal, shouldOfferTerminalSetup } from '../commands/terminalSetup/terminalSetup.js';
import { useExitOnCtrlCDWithKeybindings } from '../hooks/useExitOnCtrlCDWithKeybindings.js';
import { Box, Link, Newline, Text, useTheme } from '../ink.js';
import { useKeybindings } from '../keybindings/useKeybinding.js';
import { isUniAIAuthEnabled } from '../utils/auth.js';
import { normalizeApiKeyForConfig } from '../utils/authPortable.js';
import { getCustomApiKeyStatus } from '../utils/config.js';
import { env } from '../utils/env.js';
import { isRunningOnHomespace } from '../utils/envUtils.js';
import { PreflightStep } from '../utils/preflightChecks.js';
import type { ThemeSetting } from '../utils/theme.js';
import { ApproveApiKey } from './ApproveApiKey.js';
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js';
import { Select } from './CustomSelect/select.js';
import { WelcomeV2 } from './LogoV2/WelcomeV2.js';
import { PressEnterToContinue } from './PressEnterToContinue.js';
import { ThemePicker } from './ThemePicker.js';
import { OrderedList } from './ui/OrderedList.js';
type StepId = 'preflight' | 'theme' | 'oauth' | 'api-key' | 'security' | 'terminal-setup';
interface OnboardingStep {
  id: StepId;
  component: React.ReactNode;
}
type Props = {
  onDone(): void;
};
export function Onboarding({
  onDone
}: Props): React.ReactNode {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [skipOAuth, setSkipOAuth] = useState(false);
  const [oauthEnabled] = useState(() => isUniAIAuthEnabled());
  const [theme, setTheme] = useTheme();
  useEffect(() => {
    logEvent('tengu_began_setup', {
      oauthEnabled
    });
  }, [oauthEnabled]);
  function goToNextStep() {
    if (currentStepIndex < steps.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      logEvent('tengu_onboarding_step', {
        oauthEnabled,
        stepId: steps[nextIndex]?.id as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
      });
    } else {
      onDone();
    }
  }
  function handleThemeSelection(newTheme: ThemeSetting) {
    setTheme(newTheme);
    goToNextStep();
  }
  const exitState = useExitOnCtrlCDWithKeybindings();

  // Define all onboarding steps
  const themeStep = <Box marginX={1}>
      <ThemePicker onThemeSelect={handleThemeSelection} showIntroText={true} helpText="要稍后更改此项，请运行 /theme (To change this later, run /theme)" hideEscToCancel={true} skipExitHandling={true} // Skip exit handling as Onboarding already handles it
    />
    </Box>;
  const securityStep = <Box flexDirection="column" gap={1} paddingLeft={1}>
      <Text bold>安全注意事项 (Security notes):</Text>
      <Box flexDirection="column" width={70}>
        {/**
         * OrderedList misnumbers items when rendering conditionally,
         * so put all items in the if/else
         */}
        <OrderedList>
          <OrderedList.Item>
            <Text>UniCore 可能会出错 (UniCore can make mistakes)</Text>
            <Text dimColor wrap="wrap">
              你应该始终审查 UniCore 的回答，特别是在
              <Newline />
              运行代码时 (You should always review UniCore's responses, especially when running code)。
              <Newline />
            </Text>
          </OrderedList.Item>
          <OrderedList.Item>
            <Text>
              由于存在提示词注入风险，请仅在您信任的代码中使用它 (Due to prompt injection risks, only use it with code you trust)
            </Text>
            <Text dimColor wrap="wrap">
              更多详情请参阅 (For more details see):
              <Newline />
              <Link url="https://code.anthropic.com/docs/en/security" />
            </Text>
          </OrderedList.Item>
        </OrderedList>
      </Box>
      <PressEnterToContinue />
    </Box>;
  const preflightStep = <PreflightStep onSuccess={goToNextStep} />;
  // Create the steps array - determine which steps to include based on reAuth and oauthEnabled
  const apiKeyNeedingApproval = useMemo(() => {
    // Add API key step if needed
    // On homespace, UNICORE_API_KEY is preserved in process.env for child
    // processes but ignored by UniCore itself (see auth.ts).
    if (!process.env.UNICORE_API_KEY || isRunningOnHomespace()) {
      return '';
    }
    const customApiKeyTruncated = normalizeApiKeyForConfig(process.env.UNICORE_API_KEY);
    if (getCustomApiKeyStatus(customApiKeyTruncated) === 'new') {
      return customApiKeyTruncated;
    }
  }, []);
  function handleApiKeyDone(approved: boolean) {
    if (approved) {
      setSkipOAuth(true);
    }
    goToNextStep();
  }
  const steps: OnboardingStep[] = [];
  if (oauthEnabled) {
    steps.push({
      id: 'preflight',
      component: preflightStep
    });
  }
  steps.push({
    id: 'theme',
    component: themeStep
  });
  if (apiKeyNeedingApproval) {
    steps.push({
      id: 'api-key',
      component: <ApproveApiKey customApiKeyTruncated={apiKeyNeedingApproval} onDone={handleApiKeyDone} />
    });
  }
  if (oauthEnabled) {
    steps.push({
      id: 'oauth',
      component: <SkippableStep skip={skipOAuth} onSkip={goToNextStep}>
          <ConsoleOAuthFlow onDone={goToNextStep} />
        </SkippableStep>
    });
  }
  steps.push({
    id: 'security',
    component: securityStep
  });
  if (shouldOfferTerminalSetup()) {
    steps.push({
      id: 'terminal-setup',
      component: <Box flexDirection="column" gap={1} paddingLeft={1}>
          <Text bold>使用 UniCore 的终端设置？ (Use UniCore's terminal setup?)</Text>
          <Box flexDirection="column" width={70} gap={1}>
            <Text>
              为了获得最佳编码体验，请为您的终端启用推荐设置
              <Newline />
              (For the optimal coding experience, enable the recommended settings for your terminal):{' '}
              {env.terminal === 'Apple_Terminal' ? 'Option+Enter 换行并开启视觉铃声 (Option+Enter for newlines and visual bell)' : 'Shift+Enter 换行 (Shift+Enter for newlines)'}
            </Text>
            <Select options={[{
            label: '是，使用推荐设置 (Yes, use recommended settings)',
            value: 'install'
          }, {
            label: '不了，稍后通过 /terminal-setup 设置 (No, maybe later with /terminal-setup)',
            value: 'no'
          }]} onChange={value => {
            if (value === 'install') {
              // Errors already logged in setupTerminal, just swallow and proceed
              void setupTerminal(theme).catch(() => {}).finally(goToNextStep);
            } else {
              goToNextStep();
            }
          }} onCancel={() => goToNextStep()} />
            <Text dimColor>
              {exitState.pending ? <>再次按下 {exitState.keyName} 退出 (Press again to exit)</> : <>回车确认 · Esc 跳过 (Enter to confirm · Esc to skip)</>}
            </Text>
          </Box>
        </Box>
    });
  }
  const currentStep = steps[currentStepIndex];

  // Handle Enter on security step and Escape on terminal-setup step
  // Dependencies match what goToNextStep uses internally
  const handleSecurityContinue = useCallback(() => {
    if (currentStepIndex === steps.length - 1) {
      onDone();
    } else {
      goToNextStep();
    }
  }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
  const handleTerminalSetupSkip = useCallback(() => {
    goToNextStep();
  }, [currentStepIndex, steps.length, oauthEnabled, onDone]);
  useKeybindings({
    'confirm:yes': handleSecurityContinue
  }, {
    context: 'Confirmation',
    isActive: currentStep?.id === 'security'
  });
  useKeybindings({
    'confirm:no': handleTerminalSetupSkip
  }, {
    context: 'Confirmation',
    isActive: currentStep?.id === 'terminal-setup'
  });
  return <Box flexDirection="column">
      <WelcomeV2 />
      <Box flexDirection="column" marginTop={1}>
        {currentStep?.component}
        {exitState.pending && <Box padding={1}>
            <Text dimColor>再次按下 {exitState.keyName} 退出 (Press again to exit)</Text>
          </Box>}
      </Box>
    </Box>;
}
export function SkippableStep(t0) {
  const $ = _c(4);
  const {
    skip,
    onSkip,
    children
  } = t0;
  let t1;
  let t2;
  if ($[0] !== onSkip || $[1] !== skip) {
    t1 = () => {
      if (skip) {
        onSkip();
      }
    };
    t2 = [skip, onSkip];
    $[0] = onSkip;
    $[1] = skip;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  useEffect(t1, t2);
  if (skip) {
    return null;
  }
  return children;
}
