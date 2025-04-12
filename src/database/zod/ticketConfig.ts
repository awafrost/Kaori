import { z } from 'zod';

export const TicketConfig = z.object({
  guildId: z.string(),
  ticketChannelId: z.string().optional(),
  ticketCategoryId: z.string().optional(),
  ticketButtons: z.array(
    z.object({
      customId: z.string(),
      emoji: z.string(),
      embedTitle: z.string().optional(),
      embedDescription: z.string().optional(),
      style: z.enum(['primary', 'secondary', 'success']).optional(),
    }),
  ),
  embedTitle: z.string().optional(),
  embedDescription: z.string().optional(),
  embedColor: z.string().optional(),
  embedImage: z.string().url().optional(), // New field for image URL
  createdAt: z.date().optional(),
});