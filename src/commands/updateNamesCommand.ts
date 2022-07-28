import {ChatInputCommand} from "../models/chatInputCommand"
import {ChatInputCommandInteraction, PermissionFlagsBits, WebhookEditMessageOptions} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {DefaultConfig} from "../models/config"
import {makeEmbed} from "../utilities/responseBuilder"
import {fetchMember} from "../utilities/interactionUtilities"
import {formatName} from "../utilities/notionUtilities"

interface ResponseOptions {
    count: number
}

export class UpdateNamesCommand extends ChatInputCommand {
    public constructor() {
        super("update-names", "Update the names stored in the database", PermissionFlagsBits.Administrator)
    }

    public static buildResponse(options: ResponseOptions): WebhookEditMessageOptions {
        return {
            embeds: [makeEmbed("Updated names",
                DefaultConfig.icons.success,
                `${options.count} names updated`)],
        }
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const database = await NotionDatabase.getDefault()
        const update = []
        for await (const entry of database.getMany()) {
            const member = await fetchMember(interaction, entry.id, true)
            const name = formatName(member ?? await interaction.client.users.fetch(entry.id, {
                force: true,
            }))
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