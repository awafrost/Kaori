import * as z from 'zod';
import { Snowflake } from './util';

export const Blacklist = z.object({
  guildId: Snowflake,
  blacklistedServerId: Snowflake,
  reason: z.string(),
  blacklistedBy: Snowflake,
});

export type Blacklist = z.infer<typeof Blacklist>;