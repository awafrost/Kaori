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
        style: z.enum(['Primary', 'Secondary', 'Success', 'Danger']).optional(),
      }),
    )
    .default([]), // Tableau vide par défaut
  premiumUserId: Snowflake.nullable().optional(),
  embedTitle: z.string().nullable().optional(), // Titre de l'embed principal
  embedDescription: z.string().nullable().optional(), // Description de l'embed principal
  embedColor: z.string().nullable().optional(), // Couleur de l'embed principal
  createdAt: z.date().optional(),
});

export type TicketConfigType = z.infer<typeof TicketConfig>;