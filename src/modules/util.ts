import AdmZip from 'adm-zip';
import axios from 'axios';
import { AttachmentBuilder, PermissionFlagsBits } from 'discord.js';
import type {
  Attachment,
  Collection,
  Guild,
  Message,
  PermissionFlags,
  Snowflake,
} from 'discord.js';
import { client } from '../index';

export async function getMessage(
  ...id: [guildId: string, channelId: string, messageId: string]
): Promise<Message>;
export async function getMessage(
  ...id: [channelId: string, messageId: string]
): Promise<Message>;
export async function getMessage(...id: string[]): Promise<Message> {
  const [messageId, channelId, guildId = null] = id.slice(0, 3).reverse();
  const guild = guildId
    ? await client.guilds.fetch(guildId).catch(() => null)
    : client;
  if (!guild) throw new URIError(`Not a member of server ID: \`${guildId}\``);
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased())
    throw new URIError(
      `Channel ID: \`${channelId}\` does not exist or is inaccessible`,
    );
  const message = await channel.messages.fetch(messageId).catch(() => {});
  if (!message)
    throw new URIError(
      `Message ID: \`${messageId}\` does not exist or is inaccessible`,
    );
  return message;
}

export function formatEmoji<C extends Snowflake>(
  emojiId: C,
  animated?: false,
): `<:x:${C}>`;
export function formatEmoji<C extends Snowflake>(
  emojiId: C,
  animated?: true,
): `<a:x:${C}>`;
export function formatEmoji<C extends Snowflake>(
  emojiId: C,
  animated?: boolean,
): `<:x:${C}>` | `<a:x:${C}>`;
export function formatEmoji(emojiId: string, animated = false) {
  return `<${animated ? 'a' : ''}:x:${emojiId}>`;
}

export function range(max: number): Generator<number>;
export function range(min: number, max: number): Generator<number>;
export function* range(_min: number, _max = 0) {
  const [min, max] = _min < _max ? [_min, _max] : [_max, _min];
  for (let i = min; i < max; i++) yield i;
}

export async function createAttachment(
  attachments: Collection<string, Attachment>,
) {
  if (!attachments.size) return;
  const zip = new AdmZip();
  for await (const attachment of attachments.values()) {
    const res = await axios
      .get(attachment.url, { responseType: 'arraybuffer' })
      .catch(() => null);
    if (!res) continue;
    zip.addFile(attachment.name, res.data);
  }
  return new AttachmentBuilder(zip.toBuffer(), { name: 'attachments.zip' });
}

export async function getSendableChannel(guild: Guild, channelId: string) {
  const channel = await guild.channels.fetch(channelId);
  if (!channel?.isTextBased()) throw new TypeError('Channel is not text-based');
  const permissions = guild.members.me?.permissionsIn(channel);
  if (
    !(
      permissions?.has(PermissionFlagsBits.ViewChannel) &&
      permissions.has(PermissionFlagsBits.SendMessages)
    )
  )
    throw new ReferenceError("Missing permissions to send messages");
  return channel;
}

const permissionTexts: Record<keyof PermissionFlags, string> = {
  ViewChannel: 'View the channel',
  ManageChannels: 'Manage channels',
  ManageRoles: 'Manage roles',
  CreateGuildExpressions: 'Create expressions',
  ManageGuildExpressions: 'Manage emojis and stickers',
  ManageEmojisAndStickers: 'Manage emojis and stickers',
  ViewAuditLog: 'View audit log',
  ViewGuildInsights: 'View server insights',
  ManageWebhooks: 'Manage webhooks',
  ManageGuild: 'Manage server',

  CreateInstantInvite: 'Create invites',
  ChangeNickname: 'Change nickname',
  ManageNicknames: 'Manage nicknames',
  KickMembers: 'Kick members',
  BanMembers: 'Ban members',
  ModerateMembers: 'Timeout members',

  SendMessages: 'Send messages',
  SendMessagesInThreads: 'Send messages in threads',
  CreatePublicThreads: 'Create public threads',
  CreatePrivateThreads: 'Create private threads',
  EmbedLinks: 'Embed links',
  AttachFiles: 'Attach files',
  AddReactions: 'Add reactions',
  UseExternalEmojis: 'Use external emojis',
  UseExternalStickers: 'Use external stickers',
  MentionEveryone: 'Mention everyone, here, and all roles',
  ManageMessages: 'Manage messages',
  ManageThreads: 'Manage threads',
  ReadMessageHistory: 'Read message history',
  SendTTSMessages: 'Send text-to-speech messages',
  SendVoiceMessages: 'Send voice messages',
  SendPolls: 'Create polls',

  Connect: 'Connect',
  Speak: 'Speak',
  Stream: 'Stream webcam',
  UseSoundboard: 'Use soundboard',
  UseExternalSounds: 'Use external sounds',
  UseVAD: 'Use voice activity detection',
  PrioritySpeaker: 'Priority speaker',
  MuteMembers: 'Mute members',
  DeafenMembers: 'Deafen members',
  MoveMembers: 'Move members',

  UseApplicationCommands: 'Use application commands',
  UseEmbeddedActivities: 'Use embedded activities',

  RequestToSpeak: 'Request to speak',

  CreateEvents: 'Create events',
  ManageEvents: 'Manage events',

  Administrator: 'Administrator',

  ViewCreatorMonetizationAnalytics: 'View monetization analytics',
};

export function permToText(...perms: (keyof PermissionFlags)[]) {
  return perms.map((v) => permissionTexts[v]);
}

export function isURL(url: string) {
  return /^https?:\/\//.test(url);
}