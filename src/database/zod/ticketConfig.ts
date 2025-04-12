import * as z from 'zod';
import { Snowflake } from './util';

export const TicketConfig = z.object({
  guildId: Snowflake,
  ticketChannelId: Snowflake.nullable().optional(),
  ticketCategoryId: Snowflake.nullable().optional(),
  ticketButtons: z
    .array(
      z.object({
        label: z.string(),
        customId: z.string(),
        embedTitle: z.string().nullable().optional(),
        embedDescription: z.string().nullable().optional(),
        emoji: z.string().nullable().optional(),
        style: z.enum(['primary', 'secondary', 'success']).optional(), // Limité à trois styles
      }),
    )
    .max(5) // Limite max pour premium
    .default([]),
  premiumUserId: Snowflake.nullable().optional(),
  embedTitle: z.string().nullable().optional(),
  embedDescription: z.string().nullable().optional(),
  embedColor: z.string().nullable().optional(),
  createdAt: z.date().optional(),
});

export type TicketConfig = z.infer<typeof TicketConfig>;