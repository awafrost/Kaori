import dotenv from 'dotenv';
dotenv.config();

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
import { startTicketInactivityChecker } from '@modules/ticketInactivityChecker';

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
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User],
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
    Watching: `${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)} Members`,
    'Discord.js': `v${version}`,
    'Node.js': process.version,
    Platform: `${process.platform} | ${process.arch}`,
    Memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB | ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`,
  });

  client.user?.setActivity({
    name: `${(await client.application?.fetch())?.approximateGuildCount} servers`,
    type: ActivityType.Competing,
  });

  // Clear existing commands to avoid stale data (one-time, can be removed after successful run)
  try {
    await client.application?.commands.set([]);
    console.log('[INFO] Cleared global commands to ensure fresh registration.');
    if (process.env.GUILD_ID) {
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (guild) {
        await guild.commands.set([]);
        console.log(`[INFO] Cleared guild commands for ${guild.name}.`);
      }
    }
  } catch (error) {
    console.error('[ERROR] Failed to clear commands:', error);
  }

  // Register the commands
  await interactions.registerCommands({
    syncWithCommand: true,
    guildId: process.env.GUILD_ID, // Use guild-specific commands if GUILD_ID is set
  });
  console.log('[INFO] Commands registered successfully.');

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
    console.error('[ERROR] Interaction error:', err);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[ERROR] Uncaught exception:', err);
});

// Bot login
client.login(process.env.DISCORD_TOKEN);

// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URL ?? '', {
    dbName: process.env.DATABASE_NAME,
  })
  .then(() => {
    console.log('[INFO] Successfully connected to MongoDB');
  })
  .catch((err) => {
    console.error('[ERROR] Error connecting to MongoDB:', err);
  });