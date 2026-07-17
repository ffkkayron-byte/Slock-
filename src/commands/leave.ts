import { Message } from 'discord.js';
import { getPlayer, removePlayer } from '../player';

export const name = 'leave';
export const description = 'Desconecta o bot do canal de voz';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  await player.leave();
  removePlayer(message.guildId!);
  return message.reply('👋 Desconectado do canal de voz!');
}
