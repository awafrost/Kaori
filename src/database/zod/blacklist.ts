import * as z from 'zod';
import { Snowflake } from './util';

export const Blacklist = z.object({
  guildId: Snowflake.optional(), // Optionnel pour les blacklists globales
  blacklistedServerId: Snowflake,
  reason: z.string(),
  blacklistedBy: Snowflake,
  isGlobal: z.boolean().default(false),
});

export type Blacklist = z.infer<typeof Blacklist>;