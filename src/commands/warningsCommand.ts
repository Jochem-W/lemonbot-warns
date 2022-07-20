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

    public static async buildResponse(options: ResponseOptions): Promise<WebhookEditMessageOptions> {
        const embed = ResponseBuilder.makeEmbed(`Warnings for ${options.user.tag}`,
            options.user.displayAvatarURL({size: 4096}))

        const database = await NotionDatabase.getDefault()
        const entry = await database.getByDiscordId(options.user.id)
        if (!entry) {
            embed.setTitle("This user isn't in the database")
            return {embeds: [embed]}
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

        const embeds = [embed, ...parseResult.embeds.slice(0, 9)]
        embeds.at(-1)?.setFooter({text: "Last edited"}).setTimestamp(entry.lastEditedTime.toMillis())

        return {embeds: embeds}
    }

    public async handleCommandInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.editReply(await WarningsCommand.buildResponse({
            user: interaction.options.getUser("user", true),
        }))
    }
}
