import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { GuildConfig } from '../zod';

const { Schema, model, models } = mongoose;

const GuildConfigSchema = new Schema<z.infer<typeof GuildConfig>>({
  guildId: { type: Schema.Types.String, required: true, unique: true },
  channelId: Schema.Types.String,
  minMembersRequired: Schema.Types.Number,
  cmRoleId: Schema.Types.String,
  categoryId: Schema.Types.String,
  memberThreshold: Schema.Types.Number,
  alertUserIds: [Schema.Types.String],
  embedConfig: {
    title: Schema.Types.String,
    description: Schema.Types.String,
    image: Schema.Types.String,
    thumbnail: Schema.Types.String,
    mentionRoleId: Schema.Types.String,
  },
});

export default models?.GuildConfig
  ? (models.GuildConfig as Model<z.infer<typeof GuildConfig>>)
  : model('GuildConfig', GuildConfigSchema);