import dotenv from 'dotenv'; // Import dotenv to load environment variables
dotenv.config(); // Load the .env file

import path from 'node:path';
import {
  DiscordInteractions,
  ErrorCodes,
  InteractionsError,
} from '@akki256/discord-interaction';
import { Cron } from '@modules/cron';
import { DiscordEvents } from '@modules/events';
import {
  ActivityType,
  AllowedMentionsTypes,
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  version,
} from 'discord.js';
import mongoose from 'mongoose';
import { startTicketInactivityChecker } from '@modules/ticketInactivityChecker'; // Import ticket inactivity checker

// Set up the Discord client
export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Channel,
    Partials.GuildMember,
    Partials.Message,
    Partials.User,
  ],
  allowedMentions: {
    parse: [AllowedMentionsTypes.Role, AllowedMentionsTypes.User],
  },
});

// Initialize interactions and events
const interactions = new DiscordInteractions(client);
interactions.loadRegistries(path.resolve(__dirname, './interactions'));

const events = new DiscordEvents(client);
events.register(path.resolve(__dirname, './events'));

Cron.registerFiles(path.resolve(__dirname, './cron'));

// Bot ready event
client.once(Events.ClientReady, async () => {
  console.log('[INFO] BOT is ready!');
  console.table({
    'Bot User': client.user?.tag,
    Guilds: `${client.guilds.cache.size} Servers`,
    Watching: `${client.guilds.cache.reduce(
      (a, b) => a + b.memberCount,
      0,
    )} Members`,
    'Discord.js': `v${version}`,
    'Node.js': process.version,
    Platform: `${process.platform} | ${process.arch}`,
    Memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB | ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`,
  });

  client.user?.setActivity({
    name: `${(await client.application?.fetch())?.approximateGuildCount} servers`,
    type: ActivityType.Competing,
  });

  // Register the commands
  interactions.registerCommands({
    // guildId: process.env.GUILD_ID ?? undefined,
    syncWithCommand: true,
  });

  // Start ticket inactivity checker
  await startTicketInactivityChecker(client);
});

// Interaction handling
client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isRepliable()) return;

  interactions.run(interaction).catch((err) => {
    if (
      err instanceof InteractionsError &&
      err.code === ErrorCodes.CommandHasCoolTime
    )
      return interaction.reply({
        content: '`⌛` The command is on cooldown.',
        ephemeral: true,
      });
    console.error(err);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(err);
});

// Bot login
client.login(process.env.DISCORD_TOKEN);

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL ?? '', {
  dbName: process.env.DATABASE_NAME,
})
  .then(() => {
    console.log('Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });