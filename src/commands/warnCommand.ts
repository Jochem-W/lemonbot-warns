import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    ButtonStyle,
    channelMention,
    ChannelType,
    ChatInputCommandInteraction,
    DiscordAPIError,
    EmbedBuilder,
    Guild,
    GuildMember,
    inlineCode,
    italic,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    MessageCreateOptions,
    PermissionFlagsBits,
    RESTJSONErrorCodes,
    TextChannel,
    User,
    userMention,
    WebhookCreateMessageOptions,
} from "discord.js"
import MIMEType from "whatwg-mimetype"
import {DateTime, Duration} from "luxon"
import {DefaultConfig} from "../models/config"
import {ChatInputCommand} from "../models/chatInputCommand"
import {CustomId, InteractionScope} from "../models/customId"
import {customAlphabet} from "nanoid"
import {nolookalikesSafe} from "nanoid-dictionary"
import {
    ChannelNotFoundError,
    GuildOnlyError,
    ImageOnlyError,
    InvalidChannelTypeError,
    InvalidCustomIdError,
    InvalidPenaltyError,
    NoContentTypeError,
    reportError,
} from "../errors"
import {makeEmbed} from "../utilities/responseBuilder"
import {fetchGuild, fetchMember} from "../utilities/interactionUtilities"
import {uploadAttachment} from "../utilities/s3Utilities"
import {Prisma} from "../clients"
import type {Penalty, Reason} from "@prisma/client"

export interface ResponseOptions {
    reasons: string[]
    penalty: Penalty
    targetUser: User
    targetMember?: GuildMember
    images: string[]
    description: string
    warnedBy: User
    notified?: "DM" | TextChannel | false
    penalised?: "applied" | "error" | "not_in_server" | "not_notified"
    timestamp: DateTime
    guild: Guild
    notify: boolean
    deleteMessages?: boolean
}

export class WarnCommand extends ChatInputCommand {
    private readonly penalties: Penalty[]

    public constructor(penalties: Penalty[], reasons: Reason[]) {
        super("warn", "Warn a user", PermissionFlagsBits.ModerateMembers)

        this.penalties = penalties

        const reasonChoices = reasons.map(reason => ({name: reason.name, value: reason.name}))

        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .setRequired(true)
                .addChoices(...reasonChoices))
            .addStringOption(option => option
                .setName("description")
                .setDescription("Extended warning description that is added as a note and optionally sent to the user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("penalty")
                .setDescription("Penalty level for the user, automatically applied if notify is True")
                .setRequired(true)
                .setChoices(...penalties.map(penalty => {
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
                .setDescription(
                    "Optional image attachment that will also be sent to the user (using multiple images is discouraged)"))
            .addAttachmentOption(option => option
                .setName("image3")
                .setDescription(
                    "Optional image attachment that will also be sent to the user (using multiple images is discouraged)"))
            .addAttachmentOption(option => option
                .setName("image4")
                .setDescription(
                    "Optional image attachment that will also be sent to the user (using multiple images is discouraged)"))
            .addAttachmentOption(option => option
                .setName("image5")
                .setDescription(
                    "Optional image attachment that will also be sent to the user (using multiple images is discouraged)"))
            .addStringOption(option => option
                .setName("reason2")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .addChoices(...reasonChoices))
            .addStringOption(option => option
                .setName("reason3")
                .setDescription("Concise warning reason for administration purposes, preferably only a couple of words")
                .addChoices(...reasonChoices))
            .addBooleanOption(option => option
                .setName("delete-messages")
                .setDescription(
                    "Delete the last 7 days of messages when banning the user (only valid for ban penalties)"))
    }

    public static formatTitle(data: ResponseOptions, options?: {
        includeReasons?: boolean
        includeGuild?: boolean
        lowercase?: boolean
        verbOnly?: boolean
    }) {
        let title: string
        let preposition: string
        if (!data.notify) {
            title = "Silently warned"
            preposition = "in"
        } else if (data.penalty.timeout) {
            title = "Timed out"
            preposition = "in"
        } else if (data.penalty.ban) {
            title = "Banned"
            preposition = "from"
        } else if (data.penalty.kick) {
            title = "Kicked"
            preposition = "from"
        } else {
            title = "Warned"
            preposition = "in"
        }

        if (options?.lowercase) {
            title = title.toLowerCase()
        }

        if (options?.includeGuild) {
            title += ` ${preposition} ${data.guild.name}`
        }

        if (options?.verbOnly) {
            return title
        }

        title += ` by ${data.warnedBy.tag} `
        if (!options?.includeReasons) {
            return title
        }

        title += `for ${data.reasons.join(", ")}`
        return title
    }

    public static buildResponse(options: ResponseOptions): MessageCreateOptions {
        const reasonsText = options.reasons.join(", ")
        let administrationText = `• Reason: \`${reasonsText}\`\n• Penalty level: \`${options.penalty.name}\``
        if (options.notified === "DM") {
            administrationText += `\n• Notification: ${inlineCode("✅ (DM sent)")}`
        } else if (options.notified instanceof TextChannel) {
            administrationText +=
                `\n• Notification: ${inlineCode(`✅ (mentioned in`)} ${channelMention(options.notified.id)} ${inlineCode(
                    ")")}`
        } else if (options.notified === false) {
            administrationText += `\n• Notification: ${inlineCode("❌ (failed to DM)")}`
        } else {
            administrationText += `\n• Notification: ${inlineCode("❌ (notify was False)")}`
        }

        switch (options.penalised) {
            case "applied":
                if (options.penalty.timeout) {
                    const duration = Duration.fromObject(Object.fromEntries(Object.entries(
                        Duration.fromMillis(options.penalty.timeout)
                            .shiftTo("weeks", "days", "hours", "minutes", "seconds", "milliseconds")
                            .normalize()
                            .toObject(),
                    ).filter(([, value]) => value !== 0)))
                    administrationText +=
                        `\n• Penalised: ${inlineCode(`✅ (timed out for ${duration.toHuman()})`)}`
                } else if (options.penalty.ban) {
                    administrationText += `\n• Penalised: ${inlineCode("✅ (banned)")}`
                    administrationText += `\n• Deleted messages: ${inlineCode(
                        options.deleteMessages ? "✅ (last 7 days)" : "❌ (delete-messages was False)",
                    )}`
                } else {
                    administrationText += `\n• Penalised: ${inlineCode("❌ (penalty level has no penalty)")}`
                }

                break
            case "error":
                administrationText += `\n• Penalised: ${inlineCode("❌ (an error occurred)")}`
                break
            case "not_in_server":
                administrationText += `\n• Penalised: ${inlineCode("❌ (user not in server)")}`
                break
            case "not_notified":
                administrationText += `\n• Penalised: ${inlineCode("❌ (user wasn't notified)")}`
                break
            default:
                administrationText += `\n• Penalised: ${inlineCode("❓ (unknown)")}`
                break
        }

        const avatar = (options.targetMember ?? options.targetUser).displayAvatarURL()
        const tag = options.targetUser.tag

        const embed = makeEmbed(`${WarnCommand.formatTitle(options, {verbOnly: true})} ${tag}`,
            new URL(avatar))
            .setFields([
                {
                    name: "Description",
                    value: options.description,
                },
                {
                    name: "Administration",
                    value: administrationText,
                },
            ])
            .setFooter({
                text: WarnCommand.formatTitle(options),
                iconURL: options.warnedBy.displayAvatarURL(),
            })
            .setTimestamp(options.timestamp.toMillis())

        if (options.images.length <= 1) {
            if (options.images[0]) {
                embed.setImage(options.images[0])
            }

            return {embeds: [embed]}
        }

        const embeds = [embed]
        for (const image of options.images) {
            embeds.push(new EmbedBuilder().setImage(image))
        }

        return {embeds: embeds}
    }

    public static buildDM(options: ResponseOptions): WebhookCreateMessageOptions {
        const embed = makeEmbed(`You have been ${WarnCommand.formatTitle(options, {
            includeGuild: true,
            lowercase: true,
            verbOnly: true,
        })}`, DefaultConfig.icons.warning)
            .setColor("#ff0000")
            .setDescription(`${bold("Reason")}: ${italic(options.description)}`)
            .setTimestamp(options.timestamp.toMillis())
            .setFooter({text: "If you have any questions, please DM ModMail"})

        if (options.images.length <= 1) {
            if (options.images[0]) {
                embed.setImage(options.images[0])
            }

            return {embeds: [embed]}
        }

        const embeds = [embed]
        for (const image of options.images) {
            embeds.push(new EmbedBuilder().setImage(image).setColor("#ff0000"))
        }

        return {embeds: embeds}
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = await fetchGuild(interaction)
        if (!guild) {
            throw new GuildOnlyError()
        }

        const warnLogsChannel = await guild.channels.fetch(DefaultConfig.guild.warnLogsChannel)
        if (!warnLogsChannel) {
            throw new ChannelNotFoundError(DefaultConfig.guild.warnLogsChannel)
        }

        if (warnLogsChannel.type !== ChannelType.GuildText) {
            throw new InvalidChannelTypeError(warnLogsChannel, ChannelType.GuildText)
        }

        const penaltyName = interaction.options.getString("penalty", true)
        const penalty = this.penalties.find(p => p.name === penaltyName)
        if (!penalty) {
            throw new InvalidPenaltyError(penaltyName)
        }

        const reasons: string[] = []
        for (const name of ["reason", "reason2", "reason3"].map(option => interaction.options.getString(option))) {
            if (!name || reasons.includes(name)) {
                continue
            }

            reasons.push(name)
        }

        const images: string[] = []
        for (const image of
            ["image", "image2", "image3", "image4", "image5"].map(name => interaction.options.getAttachment(name))) {
            if (!image) {
                continue
            }

            if (!image.contentType) {
                throw new NoContentTypeError(image)
            }

            const mimeType = new MIMEType(image.contentType)
            if (mimeType.type !== "image") {
                throw new ImageOnlyError(image)
            }

            images.push(await uploadAttachment(image))
        }

        const user = interaction.options.getUser("user", true)
        const description = interaction.options.getString("description", true)

        const member = await fetchMember(interaction, user)

        const options: ResponseOptions = {
            reasons: reasons,
            penalty: penalty,
            targetUser: user,
            targetMember: member ?? undefined,
            images: images,
            description: description,
            warnedBy: interaction.user,
            timestamp: DateTime.now(),
            guild: guild,
            notify: interaction.options.getBoolean("notify", true),
            deleteMessages: interaction.options.getBoolean("delete-messages") ?? true,
        }


        if (options.notify) {
            options.notified = false
            try {
                await options.targetUser.send(WarnCommand.buildDM(options))
                options.notified = "DM"
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    throw e
                }
            }
        }

        if (options.notified === false && options.targetMember && !penalty.ban && !penalty.kick) {
            const nanoid = customAlphabet(nolookalikesSafe)
            const channelName = `${options.targetUser.username}-${options.targetUser.discriminator}-${nanoid(4)}`

            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: DefaultConfig.guild.warnCategory,
                reason: "Create a channel for privately warning a user that has DMs disabled",
            })

            await newChannel.permissionOverwrites.create(options.targetMember,
                {
                    ViewChannel: true,
                    SendMessages: false,
                    AddReactions: false,
                    ReadMessageHistory: true,
                    UseApplicationCommands: true,
                },
                {reason: "Allow the user to-be-warned to view the channel"})
            await newChannel.send({
                ...WarnCommand.buildDM(options),
                content: userMention(options.targetMember.id),
                components: [new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setLabel("Dismiss")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(new CustomId(InteractionScope.Instance,
                                interaction.commandId,
                                "dismiss",
                                [newChannel.id, options.targetMember.id]).toString()),
                    ]),
                ],
            })

            options.notified = newChannel
        }

        const reason = WarnCommand.formatTitle(options, {includeReasons: true})
        if (options.notify) {
            try {
                if (penalty.ban) {
                    if (options.targetMember) {
                        await options.targetMember.ban({
                            reason: reason,
                            deleteMessageSeconds: options.deleteMessages ? 604800 : undefined,
                        })
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else if (penalty.timeout) {
                    if (options.targetMember) {
                        await options.targetMember.timeout(penalty.timeout, reason)
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else if (penalty.kick) {
                    if (options.targetMember) {
                        await options.targetMember.kick(reason)
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else {
                    options.penalised = "applied"
                }
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                await reportError(interaction.client, e)
                options.penalised = "error"
            }
        } else {
            options.penalised = "not_notified"
        }

        await Prisma.warning.create({
            data: {
                createdAt: interaction.createdAt,
                createdBy: options.warnedBy.id,
                description: options.description,
                images: options.images,
                silent: !options.notify,
                penalty: {
                    connect: {
                        name: options.penalty.name,
                    },
                },
                reasons: {
                    connect: options.reasons.map(reason => ({name: reason})),
                },
                user: {
                    connectOrCreate: {
                        where: {
                            discordId: options.targetUser.id,
                        },
                        create: {
                            discordId: options.targetUser.id,
                            priority: false,
                        },
                    },
                },
            },
        })

        await Prisma.user.update({
            where: {
                discordId: options.targetUser.id,
            },
            data: {
                penaltyOverride: {
                    disconnect: true,
                },
            },
        })

        const response = WarnCommand.buildResponse(options)
        try {
            await interaction.editReply(response)
        } catch (e) {
            if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.UnknownMessage) {
                throw e
            }

            await warnLogsChannel.send(response)
            return
        }

        if (interaction.channelId !== warnLogsChannel.id) {
            await warnLogsChannel.send(response)
        }
    }

    public async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId): Promise<void> {
        if (data.secondary !== "dismiss") {
            return
        }

        const [channelId, userId] = data.tertiary
        if (!channelId || !userId) {
            throw new InvalidCustomIdError(data)
        }

        if (interaction.user.id !== userId) {
            await interaction.reply({
                embeds: [makeEmbed("Something went wrong while handling this interaction",
                    DefaultConfig.icons.fail,
                    "You can't use this component!")],
                ephemeral: true,
            })
            return
        }

        const channel = await interaction.client.channels.fetch(channelId)
        if (!channel) {
            throw new ChannelNotFoundError(channelId)
        }

        await channel.delete()
        await interaction.deferUpdate()
    }
}