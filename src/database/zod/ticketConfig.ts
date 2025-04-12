import * as z from 'zod';
import { Snowflake } from './util';

export const TicketConfig = z.object({
  guildId: Snowflake,
  ticketChannelId: Snowflake.nullable().optional(),
  ticketCategoryId: Snowflake.nullable().optional(),
  ticketButtons: z
    .array(
      z.object({
        customId: z.string(),
        emoji: z.string(), // ID ou Unicode
        embedTitle: z.string().nullable().optional(),
    embedDescription: z.string().nullable().optional(),
    style: z.enum(['primary', 'secondary', 'success']).optional(),
      }),
    )
    .max(5)
    .default([]),
  embedTitle: z.string().nullable().optional(),
  embedDescription: z.string().nullable().optional(),
  embedColor: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

export type TicketConfig = z.infer<typeof TicketConfig>;