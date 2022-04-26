import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ApplicationCommandOptionChoiceData, ChatInputCommandInteraction, MessageComponentInteraction} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"

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
        // TODO: limit the amount of entries
        const update = []
        for await (const entry of DatabaseUtilities.getEntries()) {
            const memberOrUser = await InteractionUtilities.fetchMemberOrUser({
                client: interaction.client,
                guild: interaction.guild ?? interaction.guildId ?? undefined,
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
            await DatabaseUtilities.updateEntry(entry.id, entry.newName)
        }

        embed.addFields([{
            name: "Database synchronised",
            value: `${update.length} names updated`,
        }])
        await interaction.editReply({embeds: [embed]})
    }

    executeComponent(interaction: MessageComponentInteraction, ...args: string[]): Promise<void> {
        return Promise.resolve(undefined)
    }

    getAutocomplete(option: ApplicationCommandOptionChoiceData): Promise<ApplicationCommandOptionChoiceData[]> {
        return Promise.resolve([])
    }
}