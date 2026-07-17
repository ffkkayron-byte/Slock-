import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'volume';
export const description = 'Ajusta o volume (0-100). Uso: !volume <0-100>';

export async function execute(message: Message, args: string[]) {
  const player = getPlayer(message.guild!);
  const vol = parseInt(args[0]);

  if (isNaN(vol) || vol < 0 || vol > 100) {
    return message.reply('❌ Use: !volume <0-100>');
  }

  player.setVolume(vol);
  return message.reply(`🔊 Volume ajustado para **${vol}%**`);
}
