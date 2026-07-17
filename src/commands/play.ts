import { Message } from 'discord.js';
import { getPlayer, searchTrack, searchSpotifyContent } from '../player';

export const name = 'play';
export const description = 'Toca uma música do YouTube ou Spotify. Uso: !play <nome ou URL>';

export async function execute(message: Message, args: string[]) {
  if (!message.member?.voice.channel) {
    return message.reply('❌ Você precisa estar em um canal de voz!');
  }

  const query = args.join(' ');
  if (!query) {
    return message.reply('❌ Use: !play <nome ou URL da música>');
  }

  const isSpotify = /open\.spotify\.com\/(?:intl-.{2}\/)?(track|album|playlist)\//.test(query);

  if (isSpotify) {
    const tracks = await searchSpotifyContent(query);
    if (!tracks || tracks.length === 0) {
      return message.reply('❌ Nenhuma música encontrada no Spotify!');
    }

    const player = getPlayer(message.guild!);
    player.textChannel = message.channel;

    if (!player.connection) {
      try {
        await player.connect(message.member);
      } catch {
        return message.reply('❌ Não consegui entrar no canal de voz!');
      }
    }

    let added = 0;
    for (const track of tracks) {
      try {
        await player.addToQueue(
          { ...track, requestedBy: message.author.username },
          message.member
        );
        added++;
      } catch {
        continue;
      }
    }

    return message.reply(`✅ Adicionadas **${added}** músicas do Spotify à fila!`);
  }

  const track = await searchTrack(query);
  if (!track) {
    return message.reply('❌ Música não encontrada!');
  }

  if (!track.url) {
    console.log('DEBUG: track.url is falsy:', track);
    return message.reply('❌ Erro: URL da música inválida!');
  }

  const player = getPlayer(message.guild!);
  player.textChannel = message.channel;

  if (!player.connection) {
    try {
      await player.connect(message.member);
    } catch {
      return message.reply('❌ Não consegui entrar no canal de voz!');
    }
  }

  const position = await player.addToQueue(
    { ...track, requestedBy: message.author.username },
    message.member
  );

  const msg = position === 1
    ? `🎵 Tocando agora: **${track.title}**`
    : `✅ Adicionado à fila (posição ${position}): **${track.title}**`;

  return message.reply(msg);
}