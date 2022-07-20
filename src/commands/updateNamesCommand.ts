import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits, WebhookEditMessageOptions} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {InteractionUtilities} from "../utilities/interactionUtilities"
import {NotionUtilities} from "../utilities/notionUtilities"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {Config} from "../config"

type ResponseOptions = {
    count: number
}

export class UpdateNamesCommand extends ChatInputCommand {
    public constructor() {
        super("update-names", "Update the names stored in the database", PermissionFlagsBits.Administrator)
    }

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        return {
            embeds: [ResponseBuilder.makeEmbed("Updated names", Config.successIcon, `${options.count} names updated`)],
        }
    }

    public async handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        const database = await NotionDatabase.getDefault()
        const update = []
        for await (const entry of database.getMany()) {
            const member = await InteractionUtilities.fetchMember(interaction, entry.id)
            const name = NotionUtilities.formatName(member ?? await interaction.client.users.fetch(entry.id))
            if (entry.name !== name) {
                update.push({
                    id: entry.id,
                    oldName: entry.name,
                    newName: name,
                })
            }
        }

        for (const entry of update) {
            await database.update(entry, {name: entry.newName})
        }

        await interaction.editReply(UpdateNamesCommand.buildResponse({count: update.length}))
    }
}