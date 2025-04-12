import * as z from 'zod';
import { Snowflake } from './util';

export const TicketTranscript = z.object({
  guildId: Snowflake,
  ticketId: Snowflake,
  userId: Snowflake,
  messages: z.array(
    z.object({
      authorId: Snowflake,
      content: z.string(),
      timestamp: z.date(),
    }),
  ),
  createdAt: z.date().optional(),
});

export type TicketTranscript = z.infer<typeof TicketTranscript>;