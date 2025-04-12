import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { Ticket } from '../zod';

const { Schema, model, models } = mongoose;

const TicketSchema = new Schema<z.infer<typeof Ticket>>({
  guildId: Schema.Types.String,
  channelId: Schema.Types.String,
  userId: Schema.Types.String,
  lastActivity: { type: Schema.Types.Date, default: Date.now },
  createdAt: { type: Schema.Types.Date, default: Date.now },
});

export default models?.Ticket
  ? (models.Ticket as Model<z.infer<typeof Ticket>>)
  : model('Ticket', TicketSchema);