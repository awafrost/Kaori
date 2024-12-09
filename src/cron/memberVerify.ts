import { AutoChangeVerifyLevelConfig, Guild } from '@models';
import { CronBuilder } from '@modules/cron';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import {
  Colors,
  type Guild as DiscordGuild,
  EmbedBuilder,
  GuildVerificationLevel,
  inlineCode,
} from 'discord.js';
import type { Model } from 'mongoose';
import { client } from '../index';
dayjs.extend(timezone);
dayjs.extend(utc);

const levels: Record<
  GuildVerificationLevel,
  { name: string; description: string }
> = {
  [GuildVerificationLevel.None]: {
    name: 'None',
    description: 'No restrictions',
  },
  [GuildVerificationLevel.Low]: {
    name: 'Low',
    description: 'Accounts with verified email only',
  },
  [GuildVerificationLevel.Medium]: {
    name: 'Medium',
    description: 'Accounts registered for at least 5 minutes',
  },
  [GuildVerificationLevel.High]: {
    name: 'High',
    description: 'Members for at least 10 minutes on this server',
  },
  [GuildVerificationLevel.VeryHigh]: {
    name: 'Very High',
    description: 'Accounts with verified phone number only',
  },
};

export default new CronBuilder({ minute: 0 }, () => {
  const now = dayjs().tz('Asia/Tokyo').get('hour');
  start(now);
  end(now);
});

async function start(hour: number) {
  const settings = await AutoChangeVerifyLevelConfig.find({
    enabled: true,
    startHour: hour,
  });

  for (const setting of settings) {
    const guild = await client.guilds.fetch(setting.guildId).catch(() => null);
    const guildModel = await Guild.findOne({ guildId: setting.guildId });

    const level = setting.level;
    if (!guild || !guildModel || level == null) return;

    guildModel.beforeVerifyLevel = guild.verificationLevel;
    await guildModel.save({ wtimeout: 1_500 });

    guild
      .setVerificationLevel(level)
      .then(() => sendLog(guild, setting, level, 'Start'))
      .catch(console.error);
  }
}

async function end(hour: number) {
  const settings = await AutoChangeVerifyLevelConfig.find({
    enabled: true,
    endHour: hour,
  });

  for (const setting of settings) {
    const guild = await client.guilds.fetch(setting.guildId).catch(() => null);
    const level = (await Guild.findOne({ guildId: guild?.id }))
      ?.beforeVerifyLevel;

    if (!guild || level == null) return;

    guild
      .setVerificationLevel(level)
      .then(() => sendLog(guild, setting, level, 'End'))
      .catch(console.error);
  }
}

async function sendLog(
  guild: DiscordGuild,
  {
    log,
  }: typeof AutoChangeVerifyLevelConfig extends Model<infer T> ? T : never,
  level: GuildVerificationLevel,
  label: string,
) {
  if (!(log.enabled && log.channel)) return;

  const channel = await guild.channels.fetch(log.channel).catch(() => null);
  if (!channel?.isTextBased()) return;

  channel
    .send({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${inlineCode('✅')} Auto Verification Level Change - ${label}`)
          .setDescription(
            [
              `Changed the server's verification level to **${levels[level].name}**`,
              inlineCode(levels[level].description),
            ].join('\n'),
          )
          .setColor(Colors.Green),
      ],
    })
    .catch(console.error);
}