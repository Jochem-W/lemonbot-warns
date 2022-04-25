import {MessageContextMenuCommandInteraction} from "discord.js"
import ContextMenuCommandWrapper from "../wrappers/contextMenuCommandWrapper"
import {ApplicationCommandType} from "discord-api-types/v10"
import InteractionHelper from "../utilities/interactionHelper"
import {unlink} from "fs/promises"
import {StorageBucket} from "../clients"
import Database from "../utilities/database"
import Embed from "../utilities/embed"

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteContextCommand extends ContextMenuCommandWrapper {
    constructor() {
        super("Add to notes", ApplicationCommandType.Message)
    }

    async execute(interaction: MessageContextMenuCommandInteraction) {
        if (!interaction.inGuild()) {
            throw new Error("This command can only be used in a guild.")
        }

        // TODO: help
        const guild = await interaction.client.guilds.fetch(interaction.guildId)
        const channel = await guild.channels.fetch(interaction.channelId)
        if (!channel?.isText()) {
            throw new Error("Channel is not a text channel")
        }

        const message = await channel.messages.fetch(interaction.targetId)
        const author = await InteractionHelper.fetchMemberOrUser(interaction.client, guild, message.author, true)

        const fileName = await InteractionHelper.messageToPng(message)
        const [file] = await StorageBucket.upload(fileName)
        await unlink(fileName)

        await file.makePublic()
        const fileUrl = file.publicUrl()

        const notesUrl = await Database.addNote(author.id, {
            body: `Message ID: ${message.id}`,
            image: fileUrl,
            url: message.url,
        }, InteractionHelper.getName(author))

        await interaction.editReply({
            embeds: [
                Embed.make(`Added note to ${InteractionHelper.getTag(author)}`, undefined, "View notes")
                    .setURL(notesUrl)
                    .setImage(fileUrl),
            ],
        })
    }
}