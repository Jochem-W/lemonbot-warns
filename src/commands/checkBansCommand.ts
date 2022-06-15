import SlashCommandConstructor from "../models/slashCommandConstructor"
import ExecutableCommand from "../models/executableCommand"
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    inlineCode,
    MessageActionRowComponentBuilder,
    MessageComponentInteraction,
    PermissionFlagsBits,
    time,
    WebhookEditMessageOptions,
} from "discord.js"
import {DateTime} from "luxon"
import EmbedUtilities from "../utilities/embedUtilities"
import {CustomId, customId, InteractionScope} from "../models/customId"

export default class CheckBansCommand extends SlashCommandConstructor<ChatInputCommandInteraction> {
    constructor() {
        super(ExecutableCheckBansCommand, "check-bans", "Check banned users", PermissionFlagsBits.ModerateMembers)
    }
}

class ExecutableCheckBansCommand extends ExecutableCommand<ChatInputCommandInteraction> {
    private bans: string[] = []
    private title = ""
    private page = 0
    private lastPage = 0
    private userCount = 25

    constructor(interaction: ChatInputCommandInteraction) {
        super(interaction)
    }

    override async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId): Promise<void> {
        switch (data.primary) {
        case "next":
            this.page++
            break
        case "previous":
            this.page--
            break
        }

        await interaction.update(this.generateReply())
    }

    async execute() {
        if (!this.interaction.inGuild()) {
            throw new Error("This command can only be used in a server")
        }

        for (const [, ban] of await this.interaction.guild!.bans.fetch()) {
            if (ban.reason !== "Account was less than 30 days old") {
                continue
            }

            const createdDate = DateTime.fromMillis(ban.user.createdTimestamp)
            if (DateTime.now().diff(createdDate).as("days") < 30) {
                continue
            }

            this.bans.push(`• ${inlineCode(ban.user.tag)} (created ${time(Math.floor(createdDate.toSeconds()), "R")})`)
        }

        for (let i = 0; i < 100; i++) {
            this.bans.push(i.toString())
        }

        this.title =
            `The following ${this.bans.length.toString()} users were automatically banned for having an account less than 30 days old and are still banned despite now having an account older than 30 days.`

        this.lastPage = Math.ceil(this.bans.length / this.userCount) - 1

        await this.interaction.editReply(this.generateReply())
    }

    async cleanup() {
        await this.disableButtons()
    }

    private generateReply(): WebhookEditMessageOptions {
        const offset = this.page * this.userCount
        let description: string | null = this.bans.slice(offset, offset + this.userCount).join("\n")
        if (description.length === 0) {
            description = null
        }

        return {
            embeds: [
                EmbedUtilities.makeEmbed("Wrongfully auto-banned users")
                    .setTitle(this.title)
                    .setDescription(description),
            ],
            components: [
                new ActionRowBuilder<MessageActionRowComponentBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(customId({
                                scope: InteractionScope.Collector,
                                primary: "previous",
                                secondary: "",
                                tertiary: [],
                            }))
                            .setDisabled(this.page === 0)
                            .setEmoji("⬅️"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Primary)
                            .setCustomId(customId({
                                scope: InteractionScope.Collector,
                                primary: "next",
                                secondary: "",
                                tertiary: [],
                            }))
                            .setDisabled(this.page === this.lastPage)
                            .setEmoji("➡️"),
                    ]),
            ],
        }
    }
}