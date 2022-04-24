import ChatInputCommandWrapper from "../types/chatInputCommandWrapper"
import {
    ApplicationCommandOptionChoiceData,
    ChatInputCommandInteraction,
    DiscordAPIError,
    RESTJSONErrorCodes,
} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"
import {Config} from "../config"

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
                .setDescription("Concise warning reason, preferably only a couple of words")
                .setRequired(true))
            .addStringOption(option => option
                .setName("description")
                .setDescription("Extended warning description")
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
    }

    getAutocomplete(option: ApplicationCommandOptionChoiceData): ApplicationCommandOptionChoiceData[] {
        switch (option.name) {
        case "penalty":
            return [
                {
                    name: "0: Nothing",
                    value: "0: Nothing",
                },
                {
                    name: "1: Warning",
                    value: "1: Warning",
                },
                {
                    name: "2: 24h Timeout",
                    value: "2: 24h Timeout",
                },
                {
                    name: "3: 1w Timeout",
                    value: "3: 1w Timeout",
                },
                {
                    name: "4: Ban/Blacklist",
                    value: "4: Ban/Blacklist",
                },
            ]
        default:
            return super.getAutocomplete(option)
        }
    }

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.inGuild()) {
            throw new Error("This command can only be used in a guild")
        }

        const user = await InteractionHelper.fetchMemberOrUser(interaction.client,
            interaction.guild,
            interaction.options.getUser("user", true))

        const reason = interaction.options.getString("reason", true)
        const description = interaction.options.getString("description", true)
        const penalty = interaction.options.getString("penalty", true)

        const entry = await Database.updateEntry(user, InteractionHelper.getName(user), penalty, [reason])

        const tag = InteractionHelper.getTag(user)

        const embed = Embed.make(`Warned ${tag}`, undefined, `Reason: ${reason}`)
            .setDescription(description)
            .addFields([{
                name: "Notion page",
                value: entry.url,
            }, {
                name: "New penalty level",
                value: penalty,
            }])

        if (!interaction.options.getBoolean("notify", true)) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        const guild = await interaction.client.guilds.fetch(interaction.guildId)

        // Try to notify the user
        try {
            await user.send({
                embeds: [
                    Embed.make(`You have been warned in ${guild.name}`,
                        Config.warnIcon,
                        `Reason: ${reason}`)
                        .setDescription(description)
                        .setColor("#ff0000"),
                ],
            })

            embed.addFields([{
                name: "Notification",
                value: "Successfully notified the user",
            }])
        } catch (e) {
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

        await interaction.editReply({embeds: [embed]})
    }
}