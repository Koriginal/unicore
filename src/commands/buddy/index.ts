import type { Command } from '../../commands.js';

const buddy: Command = {
  type: 'local-jsx',
  name: 'buddy',
  description: '见见你的编程小伙伴 (Meet your coding companion)',
  immediate: true,
  isHidden: false,
  load: () => import('./buddy.js'),
};

export default buddy;
