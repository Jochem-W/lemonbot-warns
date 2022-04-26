import {MessageContextMenuCommandInteraction} from "discord.js"
import ContextMenuCommandWrapper from "../wrappers/contextMenuCommandWrapper"
import {ApplicationCommandType} from "discord-api-types/v10"
import InteractionUtilities from "../utilities/interactionUtilities"
import {unlink} from "fs/promises"
import {StorageBucket} from "../clients"
import DatabaseUtilities from "../utilities/databaseUtilities"
import EmbedUtilities from "../utilities/embedUtilities"

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteContextCommand extends ContextMenuCommandWrapper {
    constructor() {
        super("Add to notes", ApplicationCommandType.Message)
    }

    async execute(interaction: MessageContextMenuCommandInteraction) {
        if (!interaction.inGuild()) {
            throw new Error("This command can only be used in a guild")
        }

        // TODO: help
        const guild = await interaction.client.guilds.fetch(interaction.guildId)
        const channel = await guild.channels.fetch(interaction.channelId)
        if (!channel?.isText()) {
            throw new Error("Channel is not a text channel")
        }

        const message = await channel.messages.fetch(interaction.targetId)
        const author = await InteractionUtilities.fetchMemberOrUser({
            client: interaction.client,
            guild: interaction.guild ?? interaction.guildId ?? undefined,
            user: message.author,
        })

        const fileName = await InteractionUtilities.messageToPng(message)
        const [file] = await StorageBucket.upload(fileName)
        await unlink(fileName)

        await file.makePublic()
        const fileUrl = file.publicUrl()

        const notesUrl = await DatabaseUtilities.addNote(author.id, [{
            paragraph: {
                rich_text: [{
                    text: {
                        content: `Message ID: `,
                    },
                }, {
                    text: {
                        content: message.id,
                        link: {
                            url: message.url,
                        },
                    },
                }],
            },
        }, {
            image: {
                external: {
                    url: fileUrl,
                },
            },
        }], InteractionUtilities.getName(author))

        await interaction.editReply({
            embeds: [
                EmbedUtilities.makeEmbed(`Added note to ${InteractionUtilities.getTag(author)}`,
                    undefined,
                    "View notes")
                    .setURL(notesUrl)
                    .setImage(fileUrl),
            ],
        })
    }
}