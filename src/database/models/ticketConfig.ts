import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { TicketConfig } from '../zod';

const { Schema, model, models } = mongoose;

const TicketConfigSchema = new Schema<z.infer<typeof TicketConfig>>({
  guildId: { type: Schema.Types.String, required: true },
  ticketChannelId: { type: Schema.Types.String, required: false },
  ticketCategoryId: { type: Schema.Types.String, required: false },
  ticketButtons: [
    {
      customId: { type: Schema.Types.String, required: true },
      emoji: { type: Schema.Types.String, required: true },
      embedTitle: { type: Schema.Types.String, required: false },
      embedDescription: { type: Schema.Types.String, required: false },
      style: { type: Schema.Types.String, enum: ['primary', 'secondary', 'success'], required: false },
    },
  ],
  embedTitle: { type: Schema.Types.String, required: false },
  embedDescription: { type: Schema.Types.String, required: false },
  embedColor: { type: Schema.Types.String, required: false },
  createdAt: { type: Schema.Types.Date, default: Date.now },
});

export default models?.TicketConfig
  ? (models.TicketConfig as Model<z.infer<typeof TicketConfig>>)
  : model('TicketConfig', TicketConfigSchema);