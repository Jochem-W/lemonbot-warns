/**
 * @description Slash command which lists notes on a user.
 */
import CommandWrapper from "../types/commandWrapper"
import {CommandInteraction, Permissions} from "discord.js"
import Embed from "../utilities/embed";
import Database from "../utilities/database";

export default class NotesCommand extends CommandWrapper {
    constructor() {
        super("notes", "Lists a user's notes")
        this.slashCommand
            .addUserOption(option => option
                .setName("user")
                .setDescription("The target user.")
                .setRequired(true))
    }

    async execute(interaction: CommandInteraction) {
        if (!interaction.memberPermissions?.has(Permissions.FLAGS.MODERATE_MEMBERS)) {
            await interaction.reply({
                embeds: [
                    Embed.make("Error", undefined, "You do not have permission to execute this command.")
                        .setColor("#ff0000"),
                ], ephemeral: true
            })

            return
        }

        await interaction.deferReply()

        const user = interaction.options.getUser("user", true)
        const result = await Database.watchlistLookup(user)

        const embed = Embed.make(`Notes for ${user.tag}`, user.displayAvatarURL({dynamic: true, size: 4096}))
        if (!result) {
            embed.setTitle("This user has no known notes")
            await interaction.editReply({embeds: [embed]})
            return
        }

        embed.setTitle("View notes")
        embed.setURL(result.url)

        let hasNotes = false

        for await (const note of Database.getNotes(user)) {
            hasNotes = true
            switch (note.type) {
                case "heading_1":
                    if (note.heading_1.rich_text.length !== 1) {
                        continue
                    }

                    embed.addField(note.heading_1.rich_text[0].plain_text, "Placeholder")
                    break
                case "paragraph":
                    if (note.paragraph.rich_text.length !== 1) {
                        continue
                    }

                    const plainText = note.paragraph.rich_text[0].plain_text
                    if (!embed.fields.length) {
                        embed.setDescription(`${embed.description}\n\n${plainText}`)
                        break
                    }

                    const last = embed.fields[embed.fields.length - 1]
                    last.value = last.value === "Placeholder" ? plainText : `${last.value}\n\n${plainText}`
                    break
            }
        }

        if (!embed.fields.length && !embed.description) {
            if (hasNotes) {
                embed.addField("Unsupported blocks", "Only unsupported blocks were found :(\n" +
                    "Please click the link to view the notes.")
                embed.setColor("#ff0000")
            } else {
                embed.setTitle("No notes found")
            }
        }

        await interaction.editReply({embeds: [embed]})
    }
}