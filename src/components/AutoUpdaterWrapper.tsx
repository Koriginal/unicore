import { feature } from '@/utils/feature.js';
import * as React from 'react';
import type { AutoUpdaterResult } from '../utils/autoUpdater.js';
import { isAutoUpdaterDisabled } from '../utils/config.js';
import { logForDebugging } from '../utils/debug.js';
import { isEnvTruthy } from '../utils/envUtils.js';
import { getCurrentInstallationType } from '../utils/doctorDiagnostic.js';
import { AutoUpdater } from './AutoUpdater.js';
import { NativeAutoUpdater } from './NativeAutoUpdater.js';
import { PackageManagerAutoUpdater } from './PackageManagerAutoUpdater.js';

type Props = {
  isUpdating: boolean;
  onChangeIsUpdating: (isUpdating: boolean) => void;
  onAutoUpdaterResult: (autoUpdaterResult: AutoUpdaterResult) => void;
  autoUpdaterResult: AutoUpdaterResult | null;
  showSuccessMessage: boolean;
  verbose: boolean;
};

export function AutoUpdaterWrapper({
  isUpdating,
  onChangeIsUpdating,
  onAutoUpdaterResult,
  autoUpdaterResult,
  showSuccessMessage,
  verbose,
}: Props) {
  if (
    isAutoUpdaterDisabled() ||
    isEnvTruthy(process.env.UNICORE_CODE_OFFLINE)
  ) {
    return null;
  }

  const [useNativeInstaller, setUseNativeInstaller] = React.useState<boolean | null>(null);
  const [isPackageManager, setIsPackageManager] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    void (async () => {
      if (
        feature('SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED') &&
        isAutoUpdaterDisabled()
      ) {
        logForDebugging(
          'AutoUpdaterWrapper: Skipping detection, auto-updates disabled',
        );
        return;
      }
      const installationType = await getCurrentInstallationType();
      logForDebugging(
        `AutoUpdaterWrapper: Installation type: ${installationType}`,
      );
      setUseNativeInstaller(installationType === 'native');
      setIsPackageManager(installationType === 'package-manager');
    })();
  }, []);

  if (useNativeInstaller === null || isPackageManager === null) {
    return null;
  }

  if (isPackageManager) {
    return (
      <PackageManagerAutoUpdater
        verbose={verbose}
        onAutoUpdaterResult={onAutoUpdaterResult}
        autoUpdaterResult={autoUpdaterResult}
        isUpdating={isUpdating}
        onChangeIsUpdating={onChangeIsUpdating}
        showSuccessMessage={showSuccessMessage}
      />
    );
  }

  const Updater = useNativeInstaller ? NativeAutoUpdater : AutoUpdater;
  return (
    <Updater
      verbose={verbose}
      onAutoUpdaterResult={onAutoUpdaterResult}
      autoUpdaterResult={autoUpdaterResult}
      isUpdating={isUpdating}
      onChangeIsUpdating={onChangeIsUpdating}
      showSuccessMessage={showSuccessMessage}
    />
  );
}
