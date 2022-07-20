import {
    ActionRowBuilder,
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
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
    PermissionFlagsBits,
    RESTJSONErrorCodes,
    TextChannel,
    User,
    userMention,
    WebhookEditMessageOptions,
    WebhookMessageOptions,
} from "discord.js"
import {NotionDatabase, NotionDatabaseEntry} from "../models/notionDatabase"
import {SelectPropertyResponse} from "../types/notion"
import MIMEType from "whatwg-mimetype"
import {InteractionUtilities} from "../utilities/interactionUtilities"
import {DateTime, Duration} from "luxon"
import {NotionUtilities} from "../utilities/notionUtilities"
import {Config, Penalty} from "../models/config"
import {ChatInputCommand} from "../models/chatInputCommand"
import {FirebaseUtilities} from "../utilities/firebaseUtilities"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {CustomId, InteractionScope} from "../models/customId"
import {customAlphabet} from "nanoid"
import {nolookalikesSafe} from "nanoid-dictionary"

export type ResponseOptions = {
    entry: NotionDatabaseEntry
    reasons: SelectPropertyResponse[]
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
}

export class WarnCommand extends ChatInputCommand {
    public constructor() {
        super("warn", "Warn a user", PermissionFlagsBits.ModerateMembers)
        this.builder
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

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        const reasonsText = options.reasons.map(reason => reason.name).join(", ")
        let administrationText = `• Reason: \`${reasonsText}\`\n• Penalty level: \`${options.penalty.name}\``
        if (options.notified === "DM") {
            administrationText += `\n• Notification: ${inlineCode("✅ (DM sent)")}`
        } else if (options.notified instanceof TextChannel) {
            administrationText +=
                `\n• Notification: ${inlineCode(`✅ (mentioned in`)} ${channelMention(options.notified.id)} ${inlineCode(
                    ")")}`
        } else if (options.notified === false) {
            administrationText += `\n• Notification: ${inlineCode("❌ (failed to DM or mention)")}`
        } else {
            administrationText += `\n• Notification: ${inlineCode("❌ (notify was False)")}`
        }

        switch (options.penalised) {
        case "applied":
            if (options.penalty.penalty instanceof Duration) {
                administrationText +=
                    `\n• Penalised: ${inlineCode(`✅ (timed out for ${options.penalty.penalty.toHuman()})`)}`
            } else if (options.penalty.penalty === "ban") {
                administrationText += `\n• Penalised: ${inlineCode("✅ (banned)")}`
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

        const avatar = (options.targetMember ?? options.targetUser).displayAvatarURL({size: 4096})
        const tag = options.targetUser.tag

        const embed = ResponseBuilder.makeEmbed(`${WarnCommand.getPenaltyVerb(options.penalty)} ${tag}`,
            new URL(avatar))
            .addFields([
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
                text: `${WarnCommand.getPenaltyVerb(options.penalty)} by ${options.warnedBy.tag}`,
                iconURL: options.warnedBy.displayAvatarURL({size: 4096}),
            })
            .setTimestamp(options.timestamp.toMillis())

        if (options.images.length <= 1) {
            if (options.images[0]) {
                embed.setImage(options.images[0])
            }

            return ResponseBuilder.addNotesButton({embeds: [embed]}, options.entry?.url ?? "")
        }

        const embeds = [embed]
        for (const image of options.images) {
            embeds.push(new EmbedBuilder().setImage(image))
        }

        return ResponseBuilder.addNotesButton({embeds: embeds}, options.entry?.url ?? "")
    }

    public static buildDM(options: ResponseOptions): WebhookMessageOptions {
        const embed = ResponseBuilder.makeEmbed(`You have been ${WarnCommand.getPenaltyVerb(options.penalty,
            true,
            true)} ${options.guild.name}`, Config.warnIcon)
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

    public static getPenaltyVerb(penalty: Penalty, includePreposition = false, lowercase = false): string {
        let verb = ""
        let preposition = "in"
        if (penalty.penalty instanceof Duration) {
            verb = "Timed out"
        } else {
            switch (penalty.penalty) {
            case "ban":
                verb = "Banned"
                preposition = "from"
                break
            case "kick":
                verb = "Kicked"
                preposition = "from"
                break
            case null:
                verb = "Warned"
                break
            }
        }

        if (lowercase) {
            verb = verb.toLowerCase()
        }

        return includePreposition ? `${verb} ${preposition}` : verb
    }

    public async handleAutocompleteInteraction(interaction: AutocompleteInteraction): Promise<ApplicationCommandOptionChoiceData[]> {
        switch (interaction.options.getFocused(true).name) {
        case "reason":
        case "reason2":
        case "reason3":
            const database = await NotionDatabase.getDefault()
            const reasons = await database.getReasons()
            return reasons.map(reason => {
                return {name: reason.name, value: reason.id}
            })
        }

        throw new Error("This option does not support autocomplete")
    }

    public async handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        const guild = await InteractionUtilities.fetchGuild(interaction)
        if (!guild) {
            throw new Error("This command can only be used in a server")
        }

        const penalty = Config.penalties.find(p => p.name === interaction.options.getString("penalty", true))
        if (!penalty) {
            throw new Error("Invalid penalty")
        }

        const database = await NotionDatabase.getDefault()
        const databaseReasons = await database.getReasons()

        const reasons: SelectPropertyResponse[] = []
        for (const reasonId of ["reason", "reason2", "reason3"].map(name => interaction.options.getString(name))) {
            if (!reasonId) {
                continue
            }

            const reason = databaseReasons.find(r => r.id === reasonId)
            if (!reason) {
                throw new Error(`Invalid reason ID: ${reasonId}`)
            }

            reasons.push(reason)
        }

        const images: string[] = []
        for (const image of ["image", "image2"].map(name => interaction.options.getAttachment(name))) {
            if (!image) {
                continue
            }

            if (!image.contentType) {
                throw new Error("Image has no content type")
            }

            const mimeType = new MIMEType(image.contentType)
            if (mimeType.type !== "image") {
                throw new Error("Only images are allowed")
            }

            const result = await FirebaseUtilities.uploadAttachment(image)
            images.push(result.url)
        }

        const user = interaction.options.getUser("user", true)
        const description = interaction.options.getString("description", true)

        const member = await InteractionUtilities.fetchMember(interaction, user)

        let entry = await database.getByDiscordId(user.id)
        if (!entry) {
            entry = await database.create(user.id, {
                currentPenaltyLevel: penalty.name,
                watchlist: false,
                name: NotionUtilities.formatName(member ?? user),
                reasons: reasons,
            })
        } else {
            entry = await database.update(entry, {
                currentPenaltyLevel: penalty.name,
                name: NotionUtilities.formatName(member ?? user),
                reasons: reasons,
            })
        }

        const options: ResponseOptions = {
            entry: entry,
            reasons: reasons,
            penalty: penalty,
            targetUser: user,
            targetMember: member ?? undefined,
            images: images,
            description: description,
            warnedBy: interaction.user,
            timestamp: DateTime.now(),
            guild: guild,
        }

        await database.appendBlocks(entry, NotionUtilities.generateWarnNote(options))

        if (interaction.options.getBoolean("notify", true)) {
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

        if (options.notified === false && options.targetMember) {
            const nanoid = customAlphabet(nolookalikesSafe)
            const channelName = `${options.targetUser.username}-${options.targetUser.discriminator}-${nanoid(4)}`

            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: Config.warnCategory,
                reason: "Create a channel for privately warning a user that has DMs disabled",
            })

            await newChannel.permissionOverwrites.create(options.targetMember, {ViewChannel: true}, {
                reason: "Allow the user to-be-warned to view the channel",
            })
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

        const reason = `${WarnCommand.getPenaltyVerb(options.penalty)} by ${options.warnedBy.tag}`
        if (options.notified !== false && options.notified !== undefined) {
            try {
                if (penalty.penalty === "ban") {
                    if (options.targetMember) {
                        await options.targetMember.ban({reason: reason})
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else if (penalty.penalty instanceof Duration) {
                    if (options.targetMember) {
                        await options.targetMember.timeout(penalty.penalty.toMillis(), reason)
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else if (penalty.penalty === "kick") {
                    if (options.targetMember) {
                        await options.targetMember.kick(reason)
                        options.penalised = "applied"
                    } else {
                        options.penalised = "not_in_server"
                    }
                } else if (penalty.penalty === null) {
                    options.penalised = "applied"
                }
            } catch (e) {
                console.error("Couldn't apply penalty", e)
                options.penalised = "error"
            }
        } else {
            options.penalised = "not_notified"
        }

        await interaction.editReply(WarnCommand.buildResponse(options))
    }
}