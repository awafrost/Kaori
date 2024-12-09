import { ActionRowBuilder, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Button, Modal } from '@akki256/discord-interaction';

const button = new Button(
  { customId: 'kaori:embedMaker-export' },
  (interaction) => {
    interaction.showModal(
      new ModalBuilder()
        .setCustomId('kaori:embedMaker-exportModal')
        .setTitle('Export')
        .setComponents(
          new ActionRowBuilder<TextInputBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId('fileName')
              .setLabel('File Name (Cannot use Japanese characters)')
              .setMaxLength(100)
              .setStyle(TextInputStyle.Short)
              .setRequired(false),
          ),
        ),
    );
  },
);

const modal = new Modal(
  { customId: 'kaori:embedMaker-exportModal' },
  async (interaction) => {
    if (!interaction.isFromMessage()) return;

    await interaction.deferReply({ ephemeral: true });
    const fileName = interaction.fields.getTextInputValue('fileName') || `kaori_embed_${interaction.message.id}`;

    interaction
      .followUp({
        content: '`✅` The current embed has been exported. You can load it using `/embed import`.',
        files: [new AttachmentBuilder(Buffer.from(JSON.stringify(interaction.message.embeds, null, 2)), { name: `${fileName}.json` })],
      })
      .catch(() => {
        interaction.followUp({ content: '`❌` There was an issue while exporting.', ephemeral: true });
      });
  },
);

module.exports = [button, modal];