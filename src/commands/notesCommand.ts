import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import NotionUtilities from "../utilities/notionUtilities"

/**
 * @description Slash command which lists notes on a user.
 */
export default class NotesCommand extends ChatInputCommandWrapper {
    constructor() {
        super("notes", "List a user's notes")
        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = interaction.options.getUser("user", true)
        const result = await DatabaseUtilities.getEntry(user)

        const embed = EmbedUtilities.makeEmbed(`Notes for ${user.tag}`, user.displayAvatarURL({size: 4096}))
        if (!result) {
            embed.setTitle("This user has no known notes")
            await interaction.editReply({embeds: [embed]})
            return
        }

        embed.setTitle("View notes")
            .setURL(result.url)
            .setFooter({text: "Last edited"})
            .setTimestamp(result.lastEditedTime.toMillis())

        const notes = []
        for await (const note of DatabaseUtilities.getNotes(user)) {
            notes.push(note)
        }

        const parseResult = NotionUtilities.parseBlockObjects(notes)
        if (parseResult.unsupportedBlocks) {
            const noun = parseResult.unsupportedBlocks === 1 ? "block is" : "blocks are"
            EmbedUtilities.append(embed,
                `• ${parseResult.unsupportedBlocks} ${noun} not supported and can only be viewed on Notion`,
                "\n")
        }

        if (parseResult.fields.length > 25) {
            EmbedUtilities.append(embed, `• Displaying the first 25 of ${parseResult.fields.length} notes`, "\n")
        }

        embed.addFields(parseResult.fields.slice(0, 25))

        if (!embed.data.fields?.length && !embed.data.description) {
            embed.setTitle("No notes found")
        }

        await interaction.editReply({embeds: [embed]})
    }
}