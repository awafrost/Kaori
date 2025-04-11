import * as z from 'zod';
import { Snowflake } from './util';

export const MonitoredMessage = z.object({
  guildId: Snowflake,
  channelId: Snowflake,
  messageId: Snowflake,
  inviteCode: z.string(),
  createdAt: z.date().optional(),
});

export type MonitoredMessage = z.infer<typeof MonitoredMessage>;