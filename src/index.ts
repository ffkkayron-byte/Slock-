import { Client, GatewayIntentBits, Collection, Message } from 'discord.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const prefix = '!';
const commands = new Collection<string, { execute: (message: Message, args: string[]) => Promise<any> }>();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  commands.set(command.name, command);
}

client.once('ready', () => {
  console.log(`✅ Bot logado como ${client.user?.tag}`);
  console.log(`📝 Prefixo: ${prefix}comando`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(`Erro no comando ${commandName}:`, error);
    await message.reply('❌ Ocorreu um erro ao executar o comando!');
  }
});

client.login(process.env.DISCORD_TOKEN);
