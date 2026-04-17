import { pauseProactive } from './index.js'

export function useProactive(): { pauseProactive: () => void } {
  return {
    pauseProactive,
  }
}
