import SlashCommandConstructor from "../models/slashCommandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ChatInputCommandInteraction,
    DiscordAPIError,
    GuildMember,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    PermissionFlagsBits,
    RESTJSONErrorCodes,
    User,
    userMention,
} from "discord.js"
import {DateTime, Duration} from "luxon"
import MIMEType from "whatwg-mimetype"
import NotionUtilities from "../utilities/notionUtilities"
import ResponseUtilities, {WarnData} from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import {customAlphabet} from "nanoid"
import {nolookalikesSafe} from "nanoid-dictionary"
import Config from "../config"
import {CustomId, customId, InteractionScope} from "../models/customId"
import EmbedUtilities from "../utilities/embedUtilities"

export default class WarnCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableWarnCommand, "warn", "Warn a user and add them to the watchlist",
            PermissionFlagsBits.ModerateMembers)
        this.commandBuilder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .setRequired(true)
                .setAutocomplete(true))
            .addStringOption(option => option
                .setName("description")
                .setDescription("Extended warning description that is added as a note and optionally sent to the user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("penalty")
                .setDescription("Penalty level for the user, automatically applied if notify is True")
                .setRequired(true)
                .setChoices(...Config.penalties.map(penalty => {
                    return {name: penalty.name, value: penalty.name}
                })))
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Whether to try to send a DM to the user or not")
                .setRequired(true))
            .addAttachmentOption(option => option
                .setName("image")
                .setDescription("Optional image attachment that will also be sent to the user"))
            .addAttachmentOption(option => option
                .setName("image2")
                .setDescription("Optional image attachment that will also be sent to the user"))
            .addStringOption(option => option
                .setName("reason2")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .setAutocomplete(true))
            .addStringOption(option => option
                .setName("reason3")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .setAutocomplete(true))
    }

    override async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId): Promise<void> {
        switch (data.secondary) {
        case "dismiss":
            const [channelId, userId] = data.tertiary
            if (!channelId || !userId) {
                throw new Error(`${interaction.customId} is invalid`)
            }

            if (interaction.user.id !== userId) {
                await interaction.reply({
                    embeds: [EmbedUtilities.makeEmbed("Something went wrong while handling this interaction",
                        Config.failIcon,
                        "You can't use this component!")],
                    ephemeral: true,
                })
                return
            }

            const channel = await interaction.client.channels.fetch(channelId)
            if (!channel) {
                throw new Error(`Channel ${channelId} not found`)
            }

            await channel.delete()
            await interaction.deferUpdate()
        }
    }

    override async getAutocomplete(interaction: AutocompleteInteraction) {
        switch (interaction.options.getFocused(true).name) {
        case "reason":
        case "reason2":
        case "reason3": {
            return (await DatabaseUtilities.getReasons()).map(level => ({
                name: level,
                value: level,
            }))
        }
        default:
            return []
        }
    }
}

class ExecutableWarnCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        if (!this.interaction.inGuild()) {
            throw new Error("This command can only be used in a server")
        }

        const penalty = Config.penalties.find(penalty => penalty.name ===
            this.interaction.options.getString("penalty", true))
        if (!penalty) {
            throw new Error("Invalid penalty")
        }

        const images: string[] = []
        const attachments = [
            this.interaction.options.getAttachment("image"),
            this.interaction.options.getAttachment("image2"),
        ]

        for (const attachment of attachments) {
            if (!attachment) {
                continue
            }

            if (!attachment.contentType || new MIMEType(attachment.contentType).type !== "image") {
                throw new Error("Only image attachments are supported")
            }

            const result = await InteractionUtilities.uploadAttachment(attachment)
            images.push(result.url)
        }

        const guild = await this.interaction.client.guilds.fetch({
            guild: this.interaction.guild ?? this.interaction.guildId,
            force: true,
        })

        const data: WarnData = {
            recipient: await InteractionUtilities.fetchMemberOrUser({
                client: this.interaction.client,
                guild: guild,
                user: this.interaction.options.getUser("user", true),
            }),
            warnedBy: await InteractionUtilities.fetchMemberOrUser({
                client: this.interaction.client,
                user: this.interaction.user,
            }),
            timestamp: DateTime.fromMillis(this.interaction.createdTimestamp),
            description: this.interaction.options.getString("description", true),
            images: images,
            reasons: [this.interaction.options.getString("reason", true)],
            penalty: penalty,
            url: "",
        }

        const reason2 = this.interaction.options.getString("reason2")
        if (reason2) {
            data.reasons.push(reason2)
        }

        const reason3 = this.interaction.options.getString("reason3")
        if (reason3) {
            data.reasons.push(reason3)
        }

        await DatabaseUtilities.updateEntry(data.recipient, {
            name: InteractionUtilities.getName(data.recipient),
            currentPenaltyLevel: data.penalty.name,
            reasons: data.reasons,
        })
        data.url = await DatabaseUtilities.addNotes(data.recipient, {content: NotionUtilities.generateWarnNote(data)})

        if (this.interaction.options.getBoolean("notify", true)) {
            data.notified = false
            try {
                await data.recipient.send(ResponseUtilities.generateWarnDm({
                    guildName: guild.name,
                    description: data.description,
                    images: data.images,
                    timestamp: data.timestamp,
                    penalty: data.penalty,
                }))
                data.notified = "DM"
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    throw e
                }
            }
        }

        if (data.notified === false && data.recipient instanceof GuildMember) {
            const nanoid = customAlphabet(nolookalikesSafe)
            const channelName = `${data.recipient.user.username}-${data.recipient.user.discriminator}-${nanoid(4)}`

            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: Config.warnCategory,
                reason: "Create a channel for privately warning a user that has DMs disabled",
            })

            await newChannel.permissionOverwrites.create(data.recipient, {ViewChannel: true}, {
                reason: "Allow the user to-be-warned to view the channel",
            })
            await newChannel.send({
                ...ResponseUtilities.generateWarnDm({
                    guildName: guild.name,
                    description: data.description,
                    images: data.images,
                    timestamp: data.timestamp,
                    penalty: data.penalty,
                }),
                content: userMention(data.recipient.id),
                components: [new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setLabel("Dismiss")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(customId({
                                scope: InteractionScope.Local,
                                primary: this.interaction.commandId,
                                secondary: "dismiss",
                                tertiary: [newChannel.id, data.recipient.id],
                            })),
                    ]),
                ],
            })

            data.notified = newChannel
        }

        const reason = `${ResponseUtilities.getPenaltyVerb(data.penalty)} by ${data.warnedBy.tag}`
        if (data.notified !== false && data.notified !== undefined) {
            try {
                if (penalty.penalty === "ban") {
                    if (data.recipient instanceof User) {
                        data.penalised = "not_in_server"
                    } else {
                        await data.recipient.ban({reason: reason})
                        data.penalised = "applied"
                    }
                } else if (penalty.penalty instanceof Duration) {
                    if (data.recipient instanceof User) {
                        data.penalised = "not_in_server"
                    } else {
                        await data.recipient.timeout(penalty.penalty.toMillis(), reason)
                        data.penalised = "applied"
                    }
                } else if (penalty.penalty === "kick") {
                    if (data.recipient instanceof User) {
                        data.penalised = "not_in_server"
                    } else {
                        await data.recipient.kick(reason)
                        data.penalised = "applied"
                    }
                } else if (penalty.penalty === null) {
                    data.penalised = "applied"
                }
            } catch (e) {
                console.warn("Couldn't apply penalty", e)
                data.penalised = "error"
            }
        } else {
            data.penalised = "not_notified"
        }

        await this.interaction.editReply(ResponseUtilities.generateWarnResponse(data, this.interaction))
    }
}