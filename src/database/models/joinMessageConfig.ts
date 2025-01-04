import mongoose, { type Model } from 'mongoose';
import type { z } from 'zod';
import { JoinMessageConfig } from '../zod';
import { BaseConfigSchema } from '../zod/util';
import { guildId, messageOptionSchema } from './util';

const { Schema, model, models } = mongoose;
const zodSchema = BaseConfigSchema.and(JoinMessageConfig);

const joinMessageSchema = new Schema<z.infer<typeof zodSchema>>({
  guildId,
  channel: Schema.Types.String,
  enabled: Schema.Types.Boolean,
  ignoreBot: Schema.Types.Boolean,
  message: messageOptionSchema,
  // Ajout des nouveaux champs pour la personnalisation de l'embed
  embedColor: { type: Schema.Types.String, default: 'Random' },
  embedTitle: { type: Schema.Types.String, default: 'Bienvenue !' },
  textMessage: { type: Schema.Types.String, default: '' },
  imageUrl: { type: Schema.Types.String, default: '' },
});

export default models?.joinMessageConfig
  ? (models.joinMessageConfig as Model<z.infer<typeof zodSchema>>)
  : model('joinMessageConfig', joinMessageSchema);