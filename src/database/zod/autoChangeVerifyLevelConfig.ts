import { GuildVerificationLevel } from 'discord-api-types/v10';
import { z } from 'zod';
import { Snowflake } from './util';

const hourError = { message: 'Must be set between 0 and 23' };

const AutoChangeVerifyLevelConfig = z
  .object({
    enabled: z.boolean(),
    level: z.coerce.number().pipe(z.nativeEnum(GuildVerificationLevel)),
    startHour: z.coerce.number().int().min(0, hourError).max(23, hourError),
    endHour: z.coerce.number().int().min(0, hourError).max(23, hourError),
    log: z.object({
      enabled: z.boolean(),
      channel: Snowflake.nullable(),
    }),
  })
  .superRefine((v, ctx) => {
    if (v.startHour === v.endHour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start and end times cannot be the same',
        path: ['endHour'],
      });
    }
    if (v.enabled && v.log.enabled && !v.log.channel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Channel is not set',
        path: ['log.channel'],
      });
    }
  });

export default AutoChangeVerifyLevelConfig;