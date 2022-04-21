import SlashCommandWrapper from "../types/slashCommandWrapper"
import {CommandInteraction} from "discord.js"
import Embed from "../utilities/embed"
import Database from "../utilities/database"
import {DateTime} from "luxon"

/**
 * @description Slash command which lists notes on a user.
 */
export default class NotesCommand extends SlashCommandWrapper {
    constructor() {
        super("notes", "List a user's notes")
        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        await interaction.deferReply()

        const user = interaction.options.getUser("user", true)
        const result = await Database.getEntry(user)

        const embed = Embed.make(`Notes for ${user.tag}`, user.displayAvatarURL({dynamic: true, size: 4096}))
        if (!result) {
            embed.setTitle("This user has no known notes")
            await interaction.editReply({embeds: [embed]})
            return
        }

        embed.setTitle("View notes")
        embed.setURL(result.url)

        let hasNotes = false

        let unsupportedBlocks = 0
        let possiblyTruncated = false
        for await (const note of Database.getNotes(user)) {
            hasNotes = true
            switch (note.type) {
            case "heading_1":
                embed.addField(note.heading_1.rich_text.map(t => t.plain_text).join(""), "...")
                break
            case "paragraph":
                Embed.append(embed, note.paragraph.rich_text.map(t => t.plain_text).join(""))
                break
            case "image":
                let alt = note.image.caption.map(t => t.plain_text).join("") || "View image"

                let url: string | undefined
                switch (note.image.type) {
                case "file":
                    alt += ` (link expires <t:${DateTime.fromISO(note.image.file.expiry_time).toUnixInteger()}:R>)`
                    url = note.image.file.url
                    break
                case "external":
                    url = note.image.external.url
                    break
                }

                if (!embed.image) {
                    embed.setImage(url)
                }

                Embed.append(embed, `[${alt}](${url})`)
                break
            default:
                unsupportedBlocks++
                break
            }

            if (embed.fields.length === 23) {
                possiblyTruncated = true
                break
            }
        }

        if (possiblyTruncated) {
            embed.addField("...", "View the Notion page for more notes.")
        }

        if (unsupportedBlocks) {
            embed.addField("Warning",
                `${unsupportedBlocks} unsupported block${unsupportedBlocks === 1 ?
                    "" :
                    "s"} can only be viewed in Notion.`)
        }

        if (!embed.fields.length && !embed.description) {
            embed.setTitle("No notes found")
        }

        await interaction.editReply({embeds: [embed]})
    }
}