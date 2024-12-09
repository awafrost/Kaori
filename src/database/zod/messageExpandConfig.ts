import { ChannelType } from 'discord-api-types/v10';
import { z } from 'zod';
import { Snowflake, findDuplicates } from './util';

export const MessageExpandIgnorePrefixes = ['!', '?', '.', '#', '$', '%', '&', '^', '<'];

const MessageExpandConfig = z
  .object({
    enabled: z.boolean(),
    allowExternalGuild: z.boolean(),
    ignore: z.object({
      channels: z.array(Snowflake),
      types: z.array(z.preprocess((v) => Number(v), z.nativeEnum(ChannelType))),
      prefixes: z.array(z.string()).max(5, 'Cannot register more than 5 prefixes'),
    }),
  })
  .superRefine((value, ctx) => {
    const invalidPrefixes = value.ignore.prefixes.filter(
      (v) => !MessageExpandIgnorePrefixes.includes(v),
    );

    if (invalidPrefixes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid prefixes included',
        path: ['ignore.prefixes'],
      });
    }

    if (findDuplicates(value.ignore.prefixes).length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate items found',
        path: ['ignore.prefixes'],
      });
    }
  });

export default MessageExpandConfig;