import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, Constants, DiscordAPIError} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"
import {Config} from "../config";

/**
 * @description Slash command which warns a member.
 */
export default class WarnCommand extends CommandWrapper {
    constructor() {
        super("warn", "Warn a member")
        this.commandBuilder
            .addUserOption(option => option
                .setName("member")
                .setDescription("Target member")
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
                .setDescription("New penalty level for the member")
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
                        name: "3: 48h Timeout",
                        value: "3: 48h Timeout"
                    },
                    {
                        name: "4: Ban/Blacklist",
                        value: "4: Ban/Blacklist"
                    })
                .setRequired(true))
            .addBooleanOption(option => option
                .setName("notify")
                .setDescription("Send a DM to the member")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        const member = await InteractionHelper.getMember(interaction, "member", true)

        const reason = interaction.options.getString("reason", true)
        const description = interaction.options.getString("description", true)
        const penalty = interaction.options.getString("penalty", true)

        const entry = await Database.updateEntry(member, InteractionHelper.getName(member), penalty, [reason])

        const embed = Embed.make(`Warned ${member.user.tag}`, undefined, `Reason: ${reason}`)
            .setDescription(description)
            .addField("Notion page", entry.url)
            .addField("New penalty level", penalty)

        if (!interaction.options.getBoolean("notify", true)) {
            await interaction.editReply({embeds: [embed]})
            return
        }

        // Try to notify the member
        try {
            await member.send({
                embeds: [
                    Embed.make(`You have been warned in ${(await interaction.guild!.fetch()).name}`, Config.warnIcon, `Reason: ${reason}`)
                        .setDescription(description)
                        .setColor("#ff0000"),
                ],
            })

            embed.addField("Notification", "Successfully notified the member.")
        } catch (e) {
            if ((e as DiscordAPIError).code === Constants.APIErrors.CANNOT_MESSAGE_USER) {
                embed.addField("Notification", "The member has DMs disabled.")
            } else {
                embed.addField("Notification", `${e}`)
            }
        }

        await interaction.editReply({embeds: [embed]})
    }
}