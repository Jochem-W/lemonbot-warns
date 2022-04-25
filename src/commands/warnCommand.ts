import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {
    ApplicationCommandOptionChoiceData,
    bold,
    ChatInputCommandInteraction,
    DiscordAPIError,
    EmbedBuilder,
    italic,
    RESTJSONErrorCodes,
} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import {Config} from "../config"
import MIMEType from "whatwg-mimetype"
import {DateTime} from "luxon"
import {BlockObjectRequest} from "../types/notion"

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
            return await super.getAutocomplete(option)
        }
    }

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            throw new Error("This command can only be used in a guild")
        }

        const image = interaction.options.getAttachment("image")
        if (image && (!image.contentType || new MIMEType(image.contentType).type !== "image")) {
            throw new Error("Only image attachments are supported")
        }

        const user = await InteractionUtilities.fetchMemberOrUser(interaction.client,
            interaction.guild,
            interaction.options.getUser("user", true))
        const reason = interaction.options.getString("reason", true)
        const description = interaction.options.getString("description", true)
        const penalty = interaction.options.getString("penalty", true)

        const entry = await DatabaseUtilities.updateEntry(user, InteractionUtilities.getName(user), penalty, [reason])
        const content: BlockObjectRequest[] = [{
            heading_1: {
                rich_text: [{
                    text: {
                        content: `Warned by ${interaction.user.tag} for ${reason} `,
                    },
                }, {
                    mention: {
                        date: {
                            start: DateTime.fromMillis(interaction.createdTimestamp).toISO(),
                        },
                    },
                }],
            },
        }, {
            paragraph: {
                rich_text: [{
                    text: {
                        content: description,
                    },
                }],
            },
        }]

        if (image) {
            const result = await InteractionUtilities.uploadAttachment(image)
            content.push({
                image: {
                    external: {
                        url: result.url,
                    },
                },
            })
        }

        await DatabaseUtilities.addNote(user, content)

        const tag = InteractionUtilities.getTag(user)

        const embed = EmbedUtilities.makeEmbed(`Warned ${tag}`, undefined, `Reason: ${reason}`)
            .setDescription(description)
            .addFields([
                {
                    name: "Notion page",
                    value: entry.url,
                },
                {
                    name: "New penalty level",
                    value: penalty,
                },
            ])

        if (!interaction.options.getBoolean("notify", true)) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        const guild = await interaction.client.guilds.fetch({
            guild: interaction.guildId,
            force: true,
        })

        let warnEmbed: EmbedBuilder | null
        // Try to notify the user
        try {
            warnEmbed = EmbedUtilities.makeEmbed(`You have been warned in ${guild.name}!`, Config.warnIcon)
                .setDescription(`${bold("Reason")}: ${italic(description)}`)
                .setColor("#ff0000")
            if (image) {
                warnEmbed.setImage(image.url)
            }

            await user.send({embeds: [warnEmbed]})

            embed.addFields([{
                name: "Notification",
                value: "Successfully notified the user. The message sent to the user is shown below.",
            }])
        } catch (e) {
            warnEmbed = null
            if ((e as DiscordAPIError).code === RESTJSONErrorCodes.CannotSendMessagesToThisUser) {
                embed.addFields([{
                    name: "Notification",
                    value: "The user couldn't be messaged because they either have DMs disabled or aren't in the server.",
                }])
            } else {
                embed.addFields([{
                    name: "Notification",
                    value: `The following error occurred while trying to notify the user:\n${e}`,
                }])
            }
        }

        await interaction.editReply({embeds: warnEmbed ? [embed, warnEmbed] : [embed]})
    }
}