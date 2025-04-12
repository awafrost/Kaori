import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { TicketTranscript } from '../zod';

const { Schema, model, models } = mongoose;

const TicketTranscriptSchema = new Schema<z.infer<typeof TicketTranscript>>({
  guildId: Schema.Types.String,
  ticketId: Schema.Types.String,
  userId: Schema.Types.String,
  messages: [
    {
      authorId: Schema.Types.String,
      content: Schema.Types.String,
      timestamp: Schema.Types.Date,
    },
  ],
  createdAt: { type: Schema.Types.Date, default: Date.now },
});

export default models?.TicketTranscript
  ? (models.TicketTranscript as Model<z.infer<typeof TicketTranscript>>)
  : model('TicketTranscript', TicketTranscriptSchema);