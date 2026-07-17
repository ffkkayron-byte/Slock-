import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'skip';
export const description = 'Pula para a próxima música';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  const skipped = player.skip();
  if (!skipped) {
    return message.reply('❌ Nenhuma música tocando no momento!');
  }
  return message.reply(`⏭️ Pulou: **${skipped.title}**`);
}
