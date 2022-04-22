import ChatInputCommandWrapper from "../types/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper"

/**
 * @description Slash command which synchronises the database with the current names.
 */
export default class SyncCommand extends ChatInputCommandWrapper {
    constructor() {
        super("sync", "Update the names stored in the database")
        this.builder
            .addBooleanOption(option => option
                .setName("dry")
                .setDescription("Whether to do a dry run"))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply()

        // TODO: limit the amount of entries
        const update = []
        for await (const entry of Database.getEntries()) {
            const memberOrUser = await InteractionHelper.fetchMemberOrUser(interaction.client,
                interaction.guild!,
                entry.id,
                true)
            const name = InteractionHelper.getName(memberOrUser)
            if (entry.name !== name) {
                update.push({
                    id: entry.id,
                    oldName: entry.name,
                    newName: name,
                })
            }
        }

        const embed = Embed.make("Synchronisation")
        if (interaction.options.getBoolean("dry")) {
            for (const entry of update) {
                embed.addFields([{
                    name: entry.id,
                    value: `Old: \`${entry.oldName}\`\nNew: \`${entry.newName}\``,
                }])
            }

            if (embed.data.fields?.length === 24) {
                embed.addFields([{
                    name: "Truncated",
                    value: `And ${update.length - 24} more...`,
                }])
            }

            if (!embed.data.fields?.length) {
                embed.addFields([{
                    name: "Already up to date",
                    value: "The names in the database are already up to date",
                }])
            }

            await interaction.editReply({embeds: [embed]})
            return
        }

        for (const entry of update) {
            await Database.updateEntry(entry.id, entry.newName)
        }

        embed.addFields([{
            name: "Database synchronised",
            value: `${update.length} names updated`,
        }])
        await interaction.editReply({embeds: [embed]})
    }
}