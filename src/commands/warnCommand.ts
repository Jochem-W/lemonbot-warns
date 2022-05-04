import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    DiscordAPIError,
    PermissionsBitField,
    RESTJSONErrorCodes,
    User,
} from "discord.js"
import {DateTime} from "luxon"
import MIMEType from "whatwg-mimetype"
import NotionUtilities from "../utilities/notionUtilities"
import ResponseUtilities, {WarnData} from "../utilities/responseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"

export default class WarnCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableWarnCommand, "warn", "Warn a user and add them to the watchlist",
            PermissionsBitField.Flags.ModerateMembers)
        this.commandBuilder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("reason")
                .setDescription(
                    "Concise warning reason for administration purposes, preferably only a couple of words (you can add new options here as well)")
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
    }

    override async getAutocomplete(interaction: AutocompleteInteraction) {
        switch (interaction.options.getFocused(true).name) {
        case "penalty":
            return (await DatabaseUtilities.getPenaltyLevels()).map(level => ({
                name: level,
                value: level,
            }))
        case "reason":
            return (await DatabaseUtilities.getReasons()).map(level => ({
                name: level,
                value: level,
            }))
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
            }) as User,
            timestamp: DateTime.fromMillis(this.interaction.createdTimestamp),
            description: this.interaction.options.getString("description", true),
            image: image ? (await InteractionUtilities.uploadAttachment(image)).url : undefined,
            reason: this.interaction.options.getString("reason", true),
            penalty: this.interaction.options.getString("penalty", true),
            url: "",
        }

        await DatabaseUtilities.updateEntry(data.recipient,
            InteractionUtilities.getName(data.recipient),
            data.penalty,
            [data.reason])
        data.url = await DatabaseUtilities.addNote(data.recipient, NotionUtilities.generateWarnNote(data))

        if (this.interaction.options.getBoolean("notify", true)) {
            try {
                await data.recipient.send(ResponseUtilities.generateWarnDm({
                    guildName: guild.name,
                    description: data.description,
                    image: data.image,
                    timestamp: data.timestamp,
                }))
                data.notified = true
            } catch (e) {
                if (!(e instanceof DiscordAPIError) || e.code !== RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                    throw e
                }

                data.notified = false
            }
        }

        await this.interaction.editReply(ResponseUtilities.generateWarnResponse(data, this.interaction))
    }
}