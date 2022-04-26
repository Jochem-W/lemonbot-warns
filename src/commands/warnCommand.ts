import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {
    ApplicationCommandOptionChoiceData,
    ChatInputCommandInteraction,
    DiscordAPIError,
    MessageComponentInteraction,
    RESTJSONErrorCodes,
    User,
} from "discord.js"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import MIMEType from "whatwg-mimetype"
import {DateTime} from "luxon"
import ResponseUtilities, {WarnData} from "../utilities/responseUtilities"
import NotionUtilities from "../utilities/notionUtilities"

/**
 * @description Slash command which warns a user.
 */
export default class WarnCommand extends ChatInputCommandWrapper {
    constructor() {
        super("warn", "Warn a user")
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
                .setDescription("Extended warning description that is sent to the user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("penalty")
                .setDescription("New penalty level for the user")
                .setRequired(true)
                .setAutocomplete(true))
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Send a DM to the user")
                .setRequired(true))
            .addAttachmentOption(option => option
                .setName("image")
                .setDescription("Optional image attachment"))
    }

    async getAutocomplete(option: ApplicationCommandOptionChoiceData) {
        switch (option.name) {
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

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            throw new Error("This command can only be used in a server")
        }

        const image = interaction.options.getAttachment("image")
        if (image && (!image.contentType || new MIMEType(image.contentType).type !== "image")) {
            throw new Error("Only image attachments are supported")
        }

        const guild = await interaction.client.guilds.fetch({
            guild: interaction.guild ?? interaction.guildId,
            force: true,
        })

        const data: WarnData = {
            recipient: await InteractionUtilities.fetchMemberOrUser({
                client: interaction.client,
                guild: guild,
                user: interaction.options.getUser("user", true),
            }),
            warnedBy: await InteractionUtilities.fetchMemberOrUser({
                client: interaction.client,
                user: interaction.user,
            }) as User,
            timestamp: DateTime.fromMillis(interaction.createdTimestamp),
            description: interaction.options.getString("description", true),
            image: image ? (await InteractionUtilities.uploadAttachment(image)).url : undefined,
            reason: interaction.options.getString("reason", true),
            penalty: interaction.options.getString("penalty", true),
            url: "",
        }

        await DatabaseUtilities.updateEntry(data.recipient,
            InteractionUtilities.getName(data.recipient),
            data.penalty,
            [data.reason])
        data.url = await DatabaseUtilities.addNote(data.recipient, NotionUtilities.generateWarnNote(data))

        if (interaction.options.getBoolean("notify", true)) {
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

        await interaction.editReply(ResponseUtilities.generateWarnResponse(data, interaction))
    }

    executeComponent(interaction: MessageComponentInteraction, ...args: string[]): Promise<void> {
        return Promise.resolve(undefined)
    }
}