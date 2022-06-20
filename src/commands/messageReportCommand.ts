import ExecutableCommand from "../models/executableCommand"
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    MessageContextMenuCommandInteraction,
    ModalActionRowComponentBuilder,
    ModalBuilder,
    ModalSubmitInteraction,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle,
    underscore,
} from "discord.js"
import MessageContextMenuCommandConstructor from "../models/messageContextMenuCommandConstructor"
import {customId, CustomId, InteractionScope} from "../models/customId"
import MIMEType from "whatwg-mimetype"
import {Config} from "../config"
import EmbedUtilities from "../utilities/embedUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"

export default class MessageReportCommand
    extends MessageContextMenuCommandConstructor<MessageContextMenuCommandInteraction> {
    constructor() {
        super(ExecutableMessageReportCommand, "Report message")
    }

    override async handleModalSubmit(interaction: ModalSubmitInteraction, data: CustomId) {
        switch (data.secondary) {
        case "report":
            const [channelId, messageId] = data.tertiary
            if (!channelId || !messageId) {
                throw new Error("Invalid customId")
            }

            const channel = await interaction.client.channels.fetch(channelId)
            if (!channel?.isTextBased()) {
                throw new Error("Invalid channel")
            }

            const message = await channel.messages.fetch(messageId)
            if (!message) {
                throw new Error("Invalid message")
            }

            let image: string | undefined
            for (const attachment of message.attachments.values()) {
                if (!attachment.contentType) {
                    continue
                }

                const mime = new MIMEType(attachment.contentType)
                if (mime.type === "image") {
                    image = attachment.url
                    break
                }
            }

            if (!image) {
                for (const embed of message.embeds) {
                    if (embed.image) {
                        image = embed.image.url
                        break
                    }
                }
            }

            const reportChannel = await interaction.client.channels.fetch(Config.reportChannel)
            if (!reportChannel?.isTextBased()) {
                throw new Error("Invalid report channel")
            }

            await reportChannel.send({
                embeds: [
                    EmbedUtilities.makeEmbed(`${interaction.user.tag} reported a message`,
                        interaction.user.displayAvatarURL({size: 4096}))
                        .setFields([
                            {
                                name: "Report reason",
                                value: interaction.fields.getTextInputValue("reason"),
                            },
                            {
                                name: "Content",
                                value: message.content !== "" ? message.content : "\u200b",
                            },
                        ])
                        .setImage(image ?? null)
                        .setColor(0xFF0000)
                        .setFooter({
                            text: `Original author: ${message.author.tag}`,
                            iconURL: message.author.displayAvatarURL({size: 4096}),
                        }),
                ],
                components: [
                    new ActionRowBuilder<MessageActionRowComponentBuilder>()
                        .setComponents([
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Danger)
                                .setCustomId(customId({
                                    scope: InteractionScope.Local,
                                    primary: data.primary,
                                    secondary: "delete",
                                    tertiary: [channelId, messageId],
                                }))
                                .setLabel("Delete message"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Secondary)
                                .setCustomId(customId({
                                    scope: InteractionScope.Local,
                                    primary: data.primary,
                                    secondary: "dismiss",
                                    tertiary: [],
                                }))
                                .setLabel("Dismiss"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setURL(message.url)
                                .setLabel("Jump to message"),
                        ]),
                ],
            })
            await interaction.reply({
                embeds: [
                    EmbedUtilities.makeEmbed("Message reported!", undefined, undefined,
                        "Thank you for helping us keep the server safe!")
                        .setColor(0x00FF00),
                ],
                ephemeral: true,
            })

            break
        }

        if (!interaction.deferred && !interaction.replied) {
            throw new Error(`Unhandled interaction ${interaction}`)
        }
    }

    override async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            throw new Error("You do not have permission to manage messages")
        }

        switch (data.secondary) {
        case "delete": {
            const [channelId, messageId] = data.tertiary
            if (!channelId || !messageId) {
                throw new Error(`Invalid customId ${interaction.customId}`)
            }

            const channel = await interaction.client.channels.fetch(channelId)
            if (!channel?.isTextBased()) {
                throw new Error(`Invalid channel ${channelId}`)
            }

            const message = await channel.messages.fetch(messageId)
            if (!message) {
                throw new Error(`Invalid message ${messageId}`)
            }

            await message.delete()
            if (!interaction.deferred) {
                await interaction.deferUpdate()
            }

            const originalChannel = await interaction.client.channels.fetch(interaction.channelId)
            if (!originalChannel?.isTextBased()) {
                throw new Error(`Invalid channel ${interaction.channelId}`)
            }

            const originalMessage = await originalChannel.messages.fetch(interaction.message.id)
            if (!originalMessage) {
                throw new Error(`Invalid message ${interaction.message.id}`)
            }

            await originalMessage.edit({
                embeds: [new EmbedBuilder(originalMessage.embeds[0]?.data)
                    .setTitle(bold(underscore("Message deleted")))],
            })

            await InteractionUtilities.disable(interaction)
            break
        }
        case "dismiss": {
            await InteractionUtilities.disable(interaction)
            if (!interaction.deferred) {
                await interaction.deferUpdate()
            }

            const originalChannel = await interaction.client.channels.fetch(interaction.channelId)
            if (!originalChannel?.isTextBased()) {
                throw new Error(`${interaction.customId} is invalid`)
            }

            const originalMessage = await originalChannel.messages.fetch(interaction.message.id)
            if (!originalMessage) {
                throw new Error(`${interaction.customId} is invalid`)
            }

            await originalMessage.edit({
                embeds: [new EmbedBuilder(originalMessage.embeds[0]?.data)
                    .setTitle(bold(underscore("Report dismissed")))],
            })
            break
        }
        }
    }
}

class ExecutableMessageReportCommand extends ExecutableCommand<MessageContextMenuCommandInteraction> {
    constructor(interaction: MessageContextMenuCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        await this.interaction.showModal(
            new ModalBuilder()
                .setTitle("Report message")
                .setCustomId(customId({
                    scope: InteractionScope.Local,
                    primary: this.interaction.commandId,
                    secondary: "report",
                    tertiary: [
                        this.interaction.channelId,
                        this.interaction.targetId,
                    ],
                }))
                .setComponents([
                    new ActionRowBuilder<ModalActionRowComponentBuilder>()
                        .setComponents([
                            new TextInputBuilder()
                                .setStyle(TextInputStyle.Paragraph)
                                .setRequired(true)
                                .setLabel("Reason")
                                .setCustomId("reason")
                                .setPlaceholder("Please provide a reason for reporting this message"),
                        ]),
                ]),
        )
    }
}