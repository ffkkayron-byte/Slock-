import { Message } from 'discord.js';
import { getPlayer } from '../player';

export const name = 'queue';
export const description = 'Mostra a fila de músicas';

export async function execute(message: Message) {
  const player = getPlayer(message.guild!);
  const queue = player.getQueueInfo();

  if (queue.length === 0) {
    return message.reply('📭 Fila vazia!');
  }

  const list = queue
    .map((t, i) => `${i + 1}. **${t.title}** — ${t.duration} (pedido por ${t.requestedBy})`)
    .join('\n');

  return message.reply({
    embeds: [
      {
        color: 0x3498db,
        title: '📋 Fila de músicas',
        description: list,
      },
    ],
  });
}
