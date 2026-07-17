import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'pause';
export const description = 'Pausa a música atual';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  if (player.pause()) {
    return message.reply('⏸️ Música pausada!');
  }
  return message.reply('❌ Nenhuma música tocando para pausar!');
}
