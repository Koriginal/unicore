import type { Command } from '../../commands.js'

const setupModel: Command = {
  type: 'local-jsx',
  name: 'setup',
  aliases: ['setup-model'],
  description: 'Advanced guided model gateway setup',
  isEnabled: () => true,
  load: () => import('./setup-model.js'),
}

export default setupModel
