import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import type { MonitoredMessage } from '../zod';

const { Schema, model, models } = mongoose;

const MonitoredMessageSchema = new Schema<z.infer<typeof MonitoredMessage>>({
  guildId: Schema.Types.String,
  channelId: Schema.Types.String,
  messageId: Schema.Types.String,
  inviteCode: Schema.Types.String,
  createdAt: { type: Schema.Types.Date, default: Date.now },
});

export default models?.MonitoredMessage
  ? (models.MonitoredMessage as Model<z.infer<typeof MonitoredMessage>>)
  : model('MonitoredMessage', MonitoredMessageSchema);