import * as z from 'zod';
import { Snowflake } from './util';

export const GuildConfig = z.object({
  guildId: Snowflake,
  channelId: Snowflake.optional(),
  minMembersRequired: z.number().optional(),
  cmRoleId: Snowflake.optional(),
  categoryId: Snowflake.optional(),
  memberThreshold: z.number().optional(),
  alertUserIds: z.array(Snowflake).optional(),
  embedConfig: z
    .object({
      title: z.string().nullable(),
      description: z.string().nullable(),
      image: z.string().nullable(),
      thumbnail: z.string().nullable(),
      mentionRoleId: Snowflake.nullable(),
    })
    .optional(),
});

export type GuildConfig = z.infer<typeof GuildConfig>;