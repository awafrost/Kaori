import { z } from 'zod';
import { MessageOptions, Snowflake } from './util';

const JoinMessageConfig = z
  .object({
    enabled: z.boolean(),
    channel: Snowflake.nullable(),
    message: MessageOptions,
    ignoreBot: z.boolean(),
    embedColor: z.string().default('Random'),
    embedTitle: z.string().default('Bienvenue !'),
    textMessage: z.string().default(''),
    imageUrl: z.string().default(''),
    embedDescription: z.string().default(''), // Ajout de cette ligne
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

export default JoinMessageConfig;