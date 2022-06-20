import ExecutableCommand from "../models/executableCommand"
import {
    ActionRowBuilder,
    bold,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    inlineCode,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    PermissionFlagsBits,
    WebhookEditMessageOptions,
} from "discord.js"
import SlashCommandConstructor from "../models/slashCommandConstructor"
import DatabaseUtilities, {DatabaseEntry} from "../utilities/databaseUtilities"
import EmbedUtilities from "../utilities/embedUtilities"
import {CustomId, customId, InteractionScope} from "../models/customId"

export default class WatchlistCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(WatchlistExecutableCommand, "watchlist", "List all users on the watchlist",
            PermissionFlagsBits.ModerateMembers)
    }
}

class WatchlistExecutableCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    private readonly count = 6
    private readonly entries: DatabaseEntry[] = []
    private readonly generator = DatabaseUtilities.getEntries()
    private offset = 0

    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    override async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId) {
        if (!await this.checkUser(interaction)) {
            return
        }

        switch (data.primary) {
        case "next":
            this.offset += this.count
            if (this.count + this.offset >= this.entries.length) {
                await this.load()
            }
            break
        case "previous":
            this.offset -= this.count
            break
        }

        await interaction.update(await this.generate())
    }

    async cleanup() {
        await this.disableButtons()
    }

    async execute() {
        await this.load()
        await this.load()
        await this.interaction.editReply(await this.generate())
    }

    private async generate(): Promise<WebhookEditMessageOptions> {
        const embed = EmbedUtilities.makeEmbed("Watchlist")

        const entries = this.entries.slice(this.offset, this.offset + this.count)

        let i = 0
        for (const entry of entries) {
            embed.addFields([{
                name: entry.name,
                value: `${bold("Watch")}
${inlineCode(`${entry.watchlist ? "✅" : "❌"}`)}

${bold("Penalty level")}
${inlineCode(entry.currentPenaltyLevel)}

${bold("Reasons")}
• ${entry.reasons.map(inlineCode).join("\n• ")}`,
                inline: true,
            }])

            i += 1
            if (i === 2) {
                embed.addFields([{
                    name: "\u200b",
                    value: "\u200b",
                }])
                i = 0
            }
        }

        if (entries.length % 2 === 1) {
            embed.addFields([{
                name: "\u200b",
                value: "\u200b",
            }])
        }

        return {
            embeds: [embed],
            components: [new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .setComponents([
                    new ButtonBuilder()
                        .setDisabled(this.offset === 0)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(customId({
                            scope: InteractionScope.Collector,
                            primary: "previous",
                            secondary: "",
                            tertiary: [],
                        }))
                        .setEmoji("⬅️"),
                    new ButtonBuilder()
                        .setLabel("View on Notion")
                        .setStyle(ButtonStyle.Link)
                        .setURL(await DatabaseUtilities.getParentUrl()),
                    new ButtonBuilder()
                        .setDisabled(this.offset + this.count >= this.entries.length)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(customId({
                            scope: InteractionScope.Collector,
                            primary: "next",
                            secondary: "",
                            tertiary: [],
                        }))
                        .setEmoji("➡️"),
                ]),
            ],
        }
    }

    private async load() {
        for (let i = 0; i < this.count; i++) {
            const entry = await this.generator.next()
            if (entry.done) {
                break
            }

            this.entries.push(entry.value)
        }
    }
}