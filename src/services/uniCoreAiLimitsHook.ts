import * as React from 'react'
import {
  currentLimits,
  statusListeners,
  type UniCoreAILimits,
} from './uniCoreAiLimits.js'

function subscribe(onStoreChange: () => void): () => void {
  const listener = () => onStoreChange()
  statusListeners.add(listener)
  return () => {
    statusListeners.delete(listener)
  }
}

function getSnapshot(): UniCoreAILimits {
  return currentLimits
}

export function useUniCoreAiLimits(): UniCoreAILimits {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
