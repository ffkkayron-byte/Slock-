import { Message } from 'discord.js';

export const name = 'help';
export const description = 'Mostra a lista de comandos disponíveis';

export async function execute(message: Message) {
  const commands = [
    '`!play <nome/URL>` - Toca música do YouTube ou Spotify (playlists/albuns suportados)',
    '`!skip` - Pula para a próxima música',
    '`!stop` - Para e limpa a fila',
    '`!pause` - Pausa a música',
    '`!resume` - Retoma a música',
    '`!queue` - Mostra a fila',
    '`!volume <0-100>` - Ajusta o volume',
    '`!leave` - Desconecta o bot',
    '`!help` - Mostra esta mensagem',
  ];

  return message.reply({
    embeds: [
      {
        color: 0x9b59b6,
        title: '🎵 Comandos do Bot de Música',
        description: commands.join('\n'),
        footer: { text: 'Feito com yt-dlp + discord.js' },
      },
    ],
  });
}
