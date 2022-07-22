import {
    ChatInputCommandInteraction,
    inlineCode,
    PermissionFlagsBits,
    User,
    WebhookEditMessageOptions,
} from "discord.js"
import {NotionDatabase} from "../models/notionDatabase"
import {NotionUtilities} from "../utilities/notionUtilities"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {ChatInputCommand} from "../models/chatInputCommand"

type ResponseOptions = {
    user: User
}

export class WarningsCommand extends ChatInputCommand {
    public constructor() {
        super("warnings", "List a user's warnings", PermissionFlagsBits.ModerateMembers)
        this.builder
            .addUserOption(option => option
                .setName("user")
                .setDescription("Target user")
                .setRequired(true))
    }

    public static async buildResponse(options: ResponseOptions): Promise<WebhookEditMessageOptions[]> {
        const embed = ResponseBuilder.makeEmbed(`Warnings for ${options.user.tag}`,
            new URL(options.user.displayAvatarURL({size: 4096})))
        const messages = [{embeds: [embed]}]

        const database = await NotionDatabase.getDefault()
        const entry = await database.get({id: options.user.id})
        if (!entry) {
            embed.setTitle("This user isn't in the database")
            return messages
        }

        const parseResult = await NotionUtilities.parseBlockObjects(database.getBlocks(entry))
        if (parseResult.unsupportedBlocks) {
            const noun = parseResult.unsupportedBlocks === 1 ? "block is" : "blocks are"
            embed.setDescription(
                `• ${parseResult.unsupportedBlocks} ${noun} not supported and can only be viewed on Notion`)
        }

        embed.addFields([{
            name: "Current penalty level",
            value: entry.currentPenaltyLevel,
        }, {
            name: "Reasons",
            value: entry.reasons.length ? entry.reasons.map(reason => ` - ${reason.name}`).join("\n") : "N/A",
        }, {
            name: "Watchlist",
            value: inlineCode(`${entry.watchlist ? "✅" : "❌"}`),
        }])

        embed.setFooter(null)
            .setTimestamp(null)

        for (const warnEmbed of parseResult.embeds) {
            const lastMessage = messages.at(-1)
            if (lastMessage?.embeds?.length === 10) {
                messages.push({embeds: [warnEmbed]})
                continue
            }

            lastMessage?.embeds?.push(warnEmbed)
        }

        messages.at(-1)?.embeds?.at(-1)?.setFooter({text: "Last edited"}).setTimestamp(entry.lastEditedTime.toMillis())
        return messages
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const messages = await WarningsCommand.buildResponse({
            user: interaction.options.getUser("user", true),
        })

        await interaction.editReply(messages[0]!)
        for (const message of messages.slice(1)) {
            await interaction.followUp({
                ...message,
                ephemeral: interaction.ephemeral ?? undefined,
            })
        }
    }
}
