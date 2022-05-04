import CommandConstructor from "../models/commandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {ChatInputCommandInteraction, PermissionsBitField} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"

export default class SyncCommand extends CommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableSyncCommand,
            "sync",
            "Update the names stored in the database and clear autocompletion cache",
            PermissionsBitField.Flags.ModerateMembers)
    }
}

class ExecutableSyncCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    async cleanup() {
    }

    async execute() {
        // TODO: limit the amount of entries
        const update = []
        for await (const entry of DatabaseUtilities.getEntries()) {
            const memberOrUser = await InteractionUtilities.fetchMemberOrUser({
                client: this.interaction.client,
                guild: this.interaction.guild ?? this.interaction.guildId ?? undefined,
                user: entry.id,
            })
            const name = InteractionUtilities.getName(memberOrUser)
            if (entry.name !== name) {
                update.push({
                    id: entry.id,
                    oldName: entry.name,
                    newName: name,
                })
            }
        }

        const embed = EmbedUtilities.makeEmbed("Synchronisation")
        await DatabaseUtilities.initialiseCache()
        for (const entry of update) {
            await DatabaseUtilities.updateEntry(entry.id, entry.newName)
        }

        embed.addFields([{
            name: "Database synchronised",
            value: `• ${update.length} names updated\n• Cache cleared`,
        }])
        await this.interaction.editReply({embeds: [embed]})
    }
}