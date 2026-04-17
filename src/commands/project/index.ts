import type { Command } from '../../commands.js'

const projectCommand: Command = {
  type: 'local-jsx',
  name: 'project',
  description: 'Switch to a project directory (with recent-project picker)',
  argumentHint: '[path]',
  isEnabled: () => true,
  load: () => import('./project.js'),
}

export default projectCommand

