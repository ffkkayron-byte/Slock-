import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'stop';
export const description = 'Para a música e limpa a fila';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  player.stop();
  return message.reply('⏹️ Fila limpa e música parada!');
}
