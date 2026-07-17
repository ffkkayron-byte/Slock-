import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'resume';
export const description = 'Retoma a música pausada';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  if (player.resume()) {
    return message.reply('▶️ Música retomada!');
  }
  return message.reply('❌ Nenhuma música pausada!');
}
