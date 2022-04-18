import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, GuildMember} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import InteractionHelper from "../utilities/interactionHelper";

/**
 * @description Slash command which synchronises the database with the current names.
 */
export default class SyncCommand extends CommandWrapper {
    constructor() {
        super("sync", "Update the names stored in the database")
        this.commandBuilder
            .addBooleanOption(option => option
                .setName("dry")
                .setDescription("Whether to do a dry run")
                .setRequired(false))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        // TODO: limit the amount of entries
        const update = []
        for await (const entry of Database.getEntries()) {
            const user = await interaction.client.users.fetch(entry.id)
            let member: GuildMember | undefined
            try {
                member = await interaction.guild?.members.fetch(user)
            } catch (e) {
            }

            const name = InteractionHelper.getName(member ?? user)
            if (entry.name !== name) {
                update.push({
                    id: entry.id,
                    oldName: entry.name,
                    newName: name,
                })
            }
        }

        const embed = Embed.make("Synchronisation")
        if (!update) {
            embed.setTitle("All names are up to date!")
            await interaction.editReply({embeds: [embed]})
            return
        }

        if (interaction.options.getBoolean("dry")) {
            for (const entry of update) {
                embed.addField(entry.id, `Old: \`${entry.oldName}\`\nNew: \`${entry.newName}\``)
            }

            if (embed.fields.length === 24) {
                embed.addField("Truncated", `And ${update.length - 24} more...`)
            }

            await interaction.editReply({embeds: [embed]})
            return
        }

        for (const entry of update) {
            await Database.updateEntry(entry.id, entry.newName)
        }

        embed.addField("Database synchronised", `${update.length} names updated`)
        await interaction.editReply({embeds: [embed]})
    }
}