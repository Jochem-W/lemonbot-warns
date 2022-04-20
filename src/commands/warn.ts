import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, Constants, DiscordAPIError} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"
import {Config} from "../config";

/**
 * @description Slash command which warns a user.
 */
export default class WarnCommand extends CommandWrapper {
    constructor() {
        super("warn", "Warn a user")
        this.commandBuilder
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
                .setChoices(
                    {
                        name: "0: Nothing",
                        value: "0: Nothing"
                    },
                    {
                        name: "1: Warning",
                        value: "1: Warning"
                    },
                    {
                        name: "2: 24h Timeout",
                        value: "2: 24h Timeout"
                    },
                    {
                        name: "3: 1w Timeout",
                        value: "3: 1w Timeout"
                    },
                    {
                        name: "4: Ban/Blacklist",
                        value: "4: Ban/Blacklist"
                    })
                .setRequired(true))
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Send a DM to the user")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        const user = await InteractionHelper.fetchMemberOrUser(interaction, interaction.options.getUser("user", true))

        const reason = interaction.options.getString("reason", true)
        const description = interaction.options.getString("description", true)
        const penalty = interaction.options.getString("penalty", true)

        const entry = await Database.updateEntry(user, InteractionHelper.getName(user), penalty, [reason])

        const tag = InteractionHelper.getTag(user)

        const embed = Embed.make(`Warned ${tag}`, undefined, `Reason: ${reason}`)
            .setDescription(description)
            .addField("Notion page", entry.url)
            .addField("New penalty level", penalty)

        if (!interaction.options.getBoolean("notify", true)) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        // Try to notify the user
        try {
            await user.send({
                embeds: [
                    Embed.make(`You have been warned in ${(await interaction.guild!.fetch()).name}`, Config.warnIcon, `Reason: ${reason}`)
                        .setDescription(description)
                        .setColor("#ff0000"),
                ],
            })

            embed.addField("Notification", "Successfully notified the user.")
        } catch (e) {
            if ((e as DiscordAPIError).code === Constants.APIErrors.CANNOT_MESSAGE_USER) {
                embed.addField("Notification", "The user couldn't be messaged because they either have DMs disabled or aren't in the server.")
            } else {
                embed.addField("Notification", `${e}`)
            }
        }

        await interaction.editReply({embeds: [embed]})
    }
}