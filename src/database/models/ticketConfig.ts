import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { TicketConfig } from '../zod';

const { Schema, model, models } = mongoose;

const TicketConfigSchema = new Schema<z.infer<typeof TicketConfig>>({
  guildId: Schema.Types.String,
  ticketChannelId: Schema.Types.String,
  ticketCategoryId: Schema.Types.String,
  ticketButtons: [
    {
      label: Schema.Types.String,
      customId: Schema.Types.String,
      embedTitle: Schema.Types.String,
      embedDescription: Schema.Types.String,
      style: Schema.Types.String,
    },
  ],
  embedTitle: Schema.Types.String,
  embedDescription: Schema.Types.String,
  embedColor: Schema.Types.String,
  embedImage: Schema.Types.String,
  createdAt: { type: Schema.Types.Date, default: Date.now },
});

export default models?.TicketConfig
  ? (models.TicketConfig as Model<z.infer<typeof TicketConfig>>)
  : model('TicketConfig', TicketConfigSchema);