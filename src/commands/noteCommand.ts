import ChatInputCommandWrapper from "../wrappers/chatInputCommandWrapper"
import {ChatInputCommandInteraction, GuildMember} from "discord.js"
import EmbedUtilities from "../utilities/embedUtilities"
import DatabaseUtilities from "../utilities/databaseUtilities"
import InteractionUtilities from "../utilities/interactionUtilities"
import {BlockObjectRequest} from "../types/notion"

/**
 * @description Slash command which add a note to a user.
 */
export default class NoteCommand extends ChatInputCommandWrapper {
    constructor() {
        super("note", "Add a note to a user")
        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
            .addStringOption(option => option
                .setName("body")
                .setDescription("Main note body")
                .setRequired(true))
            .addStringOption(option => option
                .setName("title")
                .setDescription("Optional note title"))
            .addAttachmentOption(option => option
                .setName("attachment")
                .setDescription("Optional file attachment"))
    }

    async execute(interaction: ChatInputCommandInteraction) {
        const user = await InteractionUtilities.fetchMemberOrUser(interaction.client,
            interaction.guild,
            interaction.options.getUser("user", true))
        const title = interaction.options.getString("title")
        const body = interaction.options.getString("body", true)
        const attachment = interaction.options.getAttachment("attachment")

        const content: BlockObjectRequest[] = []
        if (title) {
            content.push({
                heading_1: {
                    rich_text: [{
                        text: {
                            content: title,
                        },
                    }],
                },
            })
        }

        content.push({
            paragraph: {
                rich_text: [{
                    text: {
                        content: body,
                    },
                }],
            },
        })

        if (attachment) {
            const result = await InteractionUtilities.uploadAttachment(attachment)

            switch (result.type) {
            case "image":
                content.push({
                    image: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "video":
                content.push({
                    video: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "audio":
                content.push({
                    audio: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "application":
                if (result.subtype === "pdf") {
                    content.push({
                        pdf: {
                            external: {
                                url: result.url,
                            },
                        },
                    })
                    break
                } else {
                    content.push({
                        file: {
                            external: {
                                url: result.url,
                            },
                        },
                    })
                }

                break
            default:
                content.push({
                    file: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            }
        }

        const url = await DatabaseUtilities.addNote(user, content, InteractionUtilities.getName(user))

        const tag = (user instanceof GuildMember ? user.user : user).tag
        const embed = EmbedUtilities.makeEmbed(`Added note to ${tag}`, undefined, "View notes")
            .setURL(url)

        await interaction.editReply({embeds: [embed]})
    }
}