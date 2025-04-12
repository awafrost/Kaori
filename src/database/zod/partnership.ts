import * as z from 'zod';
import { Snowflake } from './util';

export const Partnership = z.object({
  guildId: Snowflake,
  partnerGuildId: Snowflake,
  userId: Snowflake,
  createdAt: z.date(),
  messageId: Snowflake.optional(),
});

export type Partnership = z.infer<typeof Partnership>;