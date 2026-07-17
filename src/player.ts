import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnection,
} from '@discordjs/voice';
import { Guild, GuildMember, Snowflake, TextBasedChannel } from 'discord.js';
import { spawn, execSync } from 'child_process';
import ytSearch from 'yt-search';

interface Track {
  title: string;
  url: string;
  duration: string;
  requestedBy: string;
  thumbnail?: string;
}

interface QueueItem {
  track: Track;
  resource: AudioResource;
}

const ytDlpPath = require('path').join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'bin', 'yt-dlp.exe');

export class GuildPlayer {
  public guild: Guild;
  public player: AudioPlayer;
  public connection: VoiceConnection | null;
  public queue: QueueItem[];
  public current: QueueItem | null;
  public volume: number;
  public textChannel: TextBasedChannel | null;

  constructor(guild: Guild) {
    this.guild = guild;
    this.player = createAudioPlayer();
    this.connection = null;
    this.queue = [];
    this.current = null;
    this.volume = 50;
    this.textChannel = null;

    this.player.on(AudioPlayerStatus.Idle, () => this.next());
    this.player.on('error', (error) => {
      console.error(`Player error in ${guild.name}:`, error.message);
      this.next();
    });
  }

  async connect(member: GuildMember): Promise<VoiceConnection> {
    const channel = member.voice.channel;
    if (!channel) throw new Error('Você precisa estar em um canal de voz!');

    this.connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
    });

    this.connection.subscribe(this.player);
    return this.connection;
  }

  async addToQueue(track: Track, member: GuildMember): Promise<number> {
    const isFirst = this.queue.length === 0 && !this.current;

    const ytProcess = spawn(ytDlpPath, [
      track.url,
      '-f', 'bestaudio',
      '-o', '-',
      '--no-warnings',
      '--no-check-certificates',
      '--add-header', 'Referer:https://www.youtube.com',
      '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    const resource = createAudioResource(ytProcess.stdout, {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume?.setVolumeLogarithmic(this.volume / 100);

    ytProcess.on('error', (err) => {
      console.error('yt-dlp error:', err);
      this.next();
    });

    ytProcess.stderr.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('ERROR')) console.error('yt-dlp:', msg);
    });

    this.queue.push({ track, resource });

    if (isFirst) this.next();
    return this.queue.length;
  }

  next(): void {
    if (this.queue.length === 0) {
      this.current = null;
      return;
    }

    this.current = this.queue.shift()!;
    this.current.resource.volume?.setVolumeLogarithmic(this.volume / 100);
    this.player.play(this.current.resource);

    if (this.textChannel && 'send' in this.textChannel) {
      (this.textChannel as any).send({
        embeds: [
          {
            color: 0x9b59b6,
            title: '🎵 Tocando agora',
            description: `**[${this.current.track.title}](${this.current.track.url})**\nDuração: ${this.current.track.duration}\nPedido por: ${this.current.track.requestedBy}`,
          },
        ],
      });
    }
  }

  skip(): Track | null {
    if (!this.current) return null;
    this.player.stop();
    const skipped = this.current.track;
    return skipped;
  }

  stop(): void {
    this.queue = [];
    if (this.current) {
      this.player.stop();
      this.current = null;
    }
  }

  pause(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(100, vol));
    if (this.current?.resource.volume) {
      this.current.resource.volume.setVolumeLogarithmic(this.volume / 100);
    }
  }

  getQueueInfo(): Track[] {
    return this.queue.map((item) => item.track);
  }

  async leave(): Promise<void> {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }
}

const players = new Map<Snowflake, GuildPlayer>();

export function getPlayer(guild: Guild): GuildPlayer {
  let player = players.get(guild.id);
  if (!player) {
    player = new GuildPlayer(guild);
    players.set(guild.id, player);
  }
  return player;
}

export function removePlayer(guildId: Snowflake): void {
  players.delete(guildId);
}

function isSpotifyUrl(url: string): boolean {
  return /open\.spotify\.com\/(?:intl-.{2}\/)?(track|album|playlist)\//.test(url);
}

async function getYtDlpInfo(url: string): Promise<{ title: string; duration: number; thumbnail: string } | null> {
  try {
    const stdout = execSync(
      `"${ytDlpPath}" --dump-json --no-warnings --skip-download "${url}"`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    const data = JSON.parse(stdout);
    return {
      title: data.title || 'Desconhecido',
      duration: data.duration || 0,
      thumbnail: data.thumbnail || '',
    };
  } catch {
    return null;
  }
}

export async function searchTrack(query: string): Promise<{ title: string; url: string; duration: string; thumbnail?: string } | null> {
  try {
    let finalUrl: string;
    let title: string;
    let durationSec: number;
    let thumbnail: string | undefined;

    if (isSpotifyUrl(query)) {
      finalUrl = query;
      const info = await getYtDlpInfo(query);
      title = info?.title || 'Música do Spotify';
      durationSec = info?.duration || 0;
      thumbnail = info?.thumbnail;
    } else {
      const isUrl = query.match(/(?:youtube\.com|youtu\.be).*[?&]v=([\w-]{11})|youtu\.be\/([\w-]{11})/);
      const searchQuery = isUrl ? (isUrl[1] || isUrl[2]) : query;
      const result = await ytSearch({ query: searchQuery });
      const video = result.videos?.[0];
      if (!video) return null;
      finalUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
      title = video.title;
      durationSec = video.seconds;
      thumbnail = video.image;
    }

    const minutes = Math.floor(durationSec / 60);
    const secs = durationSec % 60;
    return {
      title,
      url: finalUrl,
      duration: `${minutes}:${secs.toString().padStart(2, '0')}`,
      thumbnail,
    };
  } catch (error) {
    console.error('searchTrack error:', error);
    return null;
  }
}

export async function searchSpotifyContent(query: string): Promise<{ title: string; url: string; duration: string; thumbnail?: string }[] | null> {
  try {
    const isPlaylist = /open\.spotify\.com\/(?:intl-.{2}\/)?(album|playlist)\//.test(query);
    if (!isPlaylist) {
      const track = await searchTrack(query);
      return track ? [track] : null;
    }

    const stdout = execSync(
      `"${ytDlpPath}" --flat-playlist --dump-json --no-warnings --skip-download "${query}"`,
      { encoding: 'utf-8', timeout: 30000, maxBuffer: 10 * 1024 * 1024 }
    );

    const lines = stdout.trim().split('\n').filter(Boolean);
    const results: { title: string; url: string; duration: string; thumbnail?: string }[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const url = data.url || data.webpage_url;
        if (!url) continue;

        const minutes = Math.floor((data.duration || 0) / 60);
        const secs = (data.duration || 0) % 60;
        results.push({
          title: data.title || 'Desconhecido',
          url,
          duration: `${minutes}:${secs.toString().padStart(2, '0')}`,
          thumbnail: data.thumbnail,
        });
      } catch {
        continue;
      }
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('searchSpotifyContent error:', error);
    return null;
  }
}
