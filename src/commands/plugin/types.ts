import type { LocalJSXCommandOnDone } from '../../types/command.js'

export type PluginAction = 'enable' | 'disable' | 'uninstall'

export type MarketplaceAction = 'remove' | 'update'

export type ViewState =
  | { type: 'menu' }
  | { type: 'help' }
  | { type: 'validate'; path?: string }
  | { type: 'discover-plugins'; targetPlugin?: string }
  | {
      type: 'browse-marketplace'
      targetMarketplace?: string
      targetPlugin?: string
    }
  | {
      type: 'manage-plugins'
      targetPlugin?: string
      targetMarketplace?: string
      action?: PluginAction
    }
  | { type: 'marketplace-menu' }
  | { type: 'marketplace-list' }
  | { type: 'add-marketplace'; initialValue?: string }
  | {
      type: 'manage-marketplaces'
      targetMarketplace?: string
      action?: MarketplaceAction
    }

export type PluginSettingsProps = {
  onComplete: LocalJSXCommandOnDone
  args?: string
  showMcpRedirectMessage?: boolean
}
