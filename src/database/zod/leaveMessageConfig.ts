import { z } from 'zod';
import { MessageOptions, Snowflake } from './util';

const LeaveMessageConfig = z
  .object({
    enabled: z.boolean(),
    channel: Snowflake.nullable(),
    message: MessageOptions,
    ignoreBot: z.boolean(),
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

export default LeaveMessageConfig;