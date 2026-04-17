import type { Command } from '../../commands.js';
import { buildChildMessage } from '../../tools/AgentTool/forkSubagent.js';
import { isCoordinatorMode } from '../../coordinator/coordinatorMode.js';
import { getIsNonInteractiveSession } from '../../bootstrap/state.js';

const fork: Command = {
  type: 'prompt',
  name: 'fork',
  aliases: ['f'],
  description: '分叉一个后台子智能体来执行特定任务 (Fork a background subagent)',
  argumentHint: '<指令/directive>',
  context: 'fork',
  progressMessage: '正在分叉子智能体 (forking subagent)...',
  contentLength: 0,
  source: 'builtin',
  isEnabled: () => !isCoordinatorMode() && !getIsNonInteractiveSession(),
  async getPromptForCommand(args) {
    const directive = args?.trim();
    if (!directive) {
      throw new Error(
        '用法: /fork <指令>\n请提供子智能体需要执行的具体任务指令。\nUsage: /fork <directive>\nPlease provide a specific directive for the forked worker.',
      );
    }
    return [{ type: 'text', text: buildChildMessage(directive) }];
  },
};

export default fork;
