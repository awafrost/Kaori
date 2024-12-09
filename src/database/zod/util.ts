import { z } from 'zod';

export const Snowflake = z
  .string({ required_error: 'This field is required' })
  .regex(/^\d{17,19}$/, 'Invalid ID');

export namespace Embed {
  export const Thumbnail = z.object({
    url: z.string().url(),
    proxy_url: z.string().url().optional(),
    height: z.number().int().optional(),
    width: z.number().int().optional(),
  });

  export const Image = z.object({
    url: z.string().url(),
    proxy_url: z.string().url().optional(),
    height: z.number().int().optional(),
    width: z.number().int().optional(),
  });

  export const Author = z.object({
    name: z.string().max(256, 'Name must be 256 characters or less.'),
    url: z.string().url().optional(),
    icon_url: z.string().url().optional(),
    proxy_icon_url: z.string().url().optional(),
  });

  export const Footer = z.object({
    text: z.string().max(2048, 'Text must be 2048 characters or less.'),
    icon_url: z.string().url().optional(),
    proxy_icon_url: z.string().url().optional(),
  });

  export const Field = z.object({
    name: z.string().max(256, 'Name must be 256 characters or less.'),
    value: z.string().max(1024, 'Value must be 1024 characters or less.'),
    inline: z.boolean().optional(),
  });

  export const Structure = z
    .object({
      title: z.string().max(256, 'Title must be 256 characters or less.').optional(),
      description: z.string().max(4096, 'Description must be 4096 characters or less.').optional(),
      url: z.string().url().optional(),
      timestamp: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, 'Invalid date format.')
        .optional(),
      color: z.number().int().optional(),
      footer: Footer.partial(),
      image: Image.partial(),
      thumbnail: Thumbnail.partial(),
      author: Author.partial(),
      fields: z.array(Field).max(25, 'There can be no more than 25 fields.').optional(),
    })
    .superRefine((v, ctx) => {
      if (
        [
          v.title?.length,
          v.description?.length,
          v.fields?.reduce((sum, str) => sum + str.name.length + str.value.length, 0),
          v.author?.name?.length,
        ].reduce<number>((sum, num) => sum + (num || 0), 0) > 6000
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'The total characters of the embed exceed 6000.',
          path: ['title'],
        });
      }

      if (Object.values(v).every((value) => !value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either a title or description must be provided.',
          path: ['title'],
        });
      }
    });
}

export const MessageOptions = z.object({
  content: z.string().max(2000, 'Content must be 2000 characters or less.').optional(),
  embeds: z.array(Embed.Structure).max(10, 'There can be no more than 10 embeds.').optional(),
});

export const BaseConfigSchema = z.object({
  guildId: Snowflake,
});

export function findDuplicates(arr: string[]): string[] {
  const duplicates = arr.filter((item, index) => arr.indexOf(item) !== index);
  return duplicates;
}