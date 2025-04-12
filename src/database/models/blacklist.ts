import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { Blacklist } from '../zod';

const { Schema, model, models } = mongoose;

const BlacklistSchema = new Schema<z.infer<typeof Blacklist>>({
  guildId: Schema.Types.String,
  blacklistedServerId: { type: Schema.Types.String, required: true },
  reason: { type: Schema.Types.String, required: true },
  blacklistedBy: { type: Schema.Types.String, required: true },
  isGlobal: { type: Schema.Types.Boolean, default: false },
});

export default models?.Blacklist
  ? (models.Blacklist as Model<z.infer<typeof Blacklist>>)
  : model('Blacklist', BlacklistSchema);