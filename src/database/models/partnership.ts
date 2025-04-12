import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { Partnership } from '../zod';

const { Schema, model, models } = mongoose;

const PartnershipSchema = new Schema<z.infer<typeof Partnership>>({
  guildId: { type: Schema.Types.String, required: true },
  partnerGuildId: { type: Schema.Types.String, required: true },
  userId: { type: Schema.Types.String, required: true },
  createdAt: { type: Schema.Types.Date, required: true, default: Date.now },
  messageId: Schema.Types.String,
});

export default models?.Partnership
  ? (models.Partnership as Model<z.infer<typeof Partnership>>)
  : model('Partnership', PartnershipSchema);