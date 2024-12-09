import { z } from 'zod';
import { Snowflake } from './util';

export const LogConfig = z
  .object({
    enabled: z.boolean(),
    channel: Snowflake.nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.enabled && !v.channel) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Channel is not set',
        path: ['channel'],
      });
    }
  });

const EventLogConfig = z.object({
  timeout: LogConfig,
  kick: LogConfig,
  ban: LogConfig,
  voice: LogConfig,
  messageDelete: LogConfig,
  messageEdit: LogConfig,
});

export default EventLogConfig;