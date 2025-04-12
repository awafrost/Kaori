import * as z from 'zod';
import { Snowflake } from './util';

export const Ticket = z.object({
  guildId: Snowflake,
  channelId: Snowflake,
  userId: Snowflake,
  lastActivity: z.date(),
  createdAt: z.date().optional(),
});

export type Ticket = z.infer<typeof Ticket>;