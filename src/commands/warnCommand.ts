import CommandConstructor from "../models/commandConstructor"
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
    PermissionFlagsBits,
    RESTJSONErrorCodes,
    userMention,
} from "discord.js"
import {DateTime} from "luxon"
import MIMEType from "whatwg-mimetype"
import NotionUtilities from "../utilities/notionUtilities"
import ResponseUtilities, {WarnData} from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import {customAlphabet} from "nanoid"
import {nolookalikesSafe} from "nanoid-dictionary"
import {Config} from "../config"

export default class WarnCommand extends CommandConstructor<ChatInputCommandInteraction> {
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
                .setDescription("New penalty level for the user (penalties have to be applied separately)")
                .setRequired(true)
                .setAutocomplete(true))
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Whether to try to send a DM to the user or not")
                .setRequired(true))
            .addAttachmentOption(option => option
                .setName("image")
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

    override async getAutocomplete(interaction: AutocompleteInteraction) {
        switch (interaction.options.getFocused(true).name) {
        case "penalty": {
            const options = (await DatabaseUtilities.getPenaltyLevels()).map(level => ({
                name: level,
                value: level,
            }))
            console.log("Submitting penalty autocomplete", options)
            return options
        }
        case "reason":
        case "reason2":
        case "reason3": {
            const options = (await DatabaseUtilities.getReasons()).map(level => ({
                name: level,
                value: level,
            }))
            console.log("Submitting reasons autocomplete", options)
            return options
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

        const image = this.interaction.options.getAttachment("image")
        if (image && (!image.contentType || new MIMEType(image.contentType).type !== "image")) {
            throw new Error("Only image attachments are supported")
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
            image: image ? (await InteractionUtilities.uploadAttachment(image)).url : undefined,
            reasons: [this.interaction.options.getString("reason", true)],
            penalty: this.interaction.options.getString("penalty", true),
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
            currentPenaltyLevel: data.penalty,
            reasons: data.reasons,
        })
        data.url = await DatabaseUtilities.addNotes(data.recipient, {content: NotionUtilities.generateWarnNote(data)})

        if (this.interaction.options.getBoolean("notify", true)) {
            data.notified = false
            try {
                await data.recipient.send(ResponseUtilities.generateWarnDm({
                    guildName: guild.name,
                    description: data.description,
                    image: data.image,
                    timestamp: data.timestamp,
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

            const newChannel = await guild.channels.create(channelName, {
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
                    image: data.image,
                    timestamp: data.timestamp,
                }),
                content: userMention(data.recipient.id),
                components: [new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setLabel("Dismiss")
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`global:warn:dismiss:${data.recipient.user.id}:${newChannel.id}`),
                    ]),
                ],
            })

            data.notified = newChannel
        }

        await this.interaction.editReply(ResponseUtilities.generateWarnResponse(data, this.interaction))
    }
}