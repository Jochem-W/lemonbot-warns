import {
    ActionRowBuilder,
    CollectedInteraction,
    CommandInteraction,
    InteractionCollector,
    InteractionReplyOptions,
    MessageActionRowComponentBuilder,
    WebhookEditMessageOptions,
} from "discord.js"
import {Duration} from "luxon"
import {ResponseBuilder} from "../utilities/responseBuilder"
import {reportError} from "../errors"

export class InteractionCollectorHelper {
    private collector: InteractionCollector<CollectedInteraction>
    private components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = []
    private interaction: CommandInteraction

    private constructor(interaction: CommandInteraction, collector: InteractionCollector<CollectedInteraction>) {
        this.interaction = interaction
        this.collector = collector.on("end", async () => {
            try {
                await interaction.editReply({components: this.components})
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                await reportError(interaction.client, e)
            }
        })
    }

    public static async create(interaction: CommandInteraction): Promise<InteractionCollectorHelper> {
        const collector = new InteractionCollector(interaction.client, {
            channel: interaction.channel ?? interaction.channelId,
            guild: interaction.guild ?? interaction.guildId ?? undefined,
            message: await interaction.fetchReply(),
            idle: Duration.fromDurationLike({minutes: 15}).toMillis(),
            dispose: true,
        })

        return new InteractionCollectorHelper(interaction, collector)
    }

    public addListener(listener: (collected: CollectedInteraction) => Promise<void>): this {
        this.collector.on("collect", async (collected) => {
            try {
                await listener(collected)
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                await reportError(this.interaction.client, e)

                const message: InteractionReplyOptions = {
                    embeds: [ResponseBuilder.makeErrorEmbed(e)],
                    ephemeral: this.interaction.ephemeral ?? undefined,
                }

                if (collected.replied) {
                    await collected.followUp(message)
                    return
                }

                await collected.reply(message)
            }
        })

        return this
    }

    public updateComponents(components: WebhookEditMessageOptions["components"]): void {
        this.components = components?.map(row => {
            let builder: ActionRowBuilder<MessageActionRowComponentBuilder>
            if ("toJSON" in row) {
                builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row.toJSON())
            } else {
                builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(row)
            }

            for (const component of builder.components) {
                component.setDisabled(true)
            }

            return builder
        }) ?? []
    }
}