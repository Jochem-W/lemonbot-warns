import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import {Config} from "../config";

/**
 * @description Slash command which synchronises the database with the current names.
 */
export default class SyncCommand extends CommandWrapper {
    constructor() {
        super("sync", "Update the names stored in the database")
        this.slashCommand
            .addBooleanOption(option => option
                .setName("dry")
                .setDescription("Whether to do a dry run")
                .setRequired(false))
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.options.getBoolean("dry")) {
            await interaction.reply({
                embeds: [
                    Embed.make("Synchronisation", Config.failIcon, "Only dry runs are supported for now")
                ]
            })
            return
        }

        await interaction.deferReply()

        const stored: { id: string; name: string; }[] = []
        for await (const pair of Database.getIdNamePairs()) {
            stored.push(pair)
        }

        const update = []
        for (const pair of stored) {
            const user = await interaction.client.users.fetch(pair.id)
            let member
            try {
                member = await interaction.guild!.members.fetch(user)
            } catch (e) {
            }

            const name = member?.nickname ? `${user.tag} (${member.nickname})` : user.tag
            if (name !== pair.name) {
                update.push({
                    id: pair.id,
                    name: name
                })
            }
        }

        const embed = Embed.make("Synchronisation")

        if (!update) {
            embed.setTitle("All names are up to date!")
            await interaction.editReply({embeds: [embed]})
            return
        }

        for (const pair of update) {
            const old = stored.find(p => p.id === pair.id)!
            embed.addField(pair.id, `Current: "${old.name}"\nNew: "${pair.name}"`)
            if (embed.fields.length === 24) {
                embed.addField("Truncated", `And ${update.length - 24} more...`)
            }
        }
        embed.setTitle("The following names are out of sync: (and no changes were made)")

        if (interaction.options.getBoolean("dry")) {
        } else {
        }

        // TODO: actually update the names

        await interaction.editReply({embeds: [embed]})
    }
}