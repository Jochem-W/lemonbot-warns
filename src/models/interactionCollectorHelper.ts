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

export class InteractionCollectorHelper {
    private collector: InteractionCollector<CollectedInteraction>
    private components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = []
    private interaction: CommandInteraction

    private constructor(interaction: CommandInteraction, collector: InteractionCollector<CollectedInteraction>) {
        this.interaction = interaction
        this.collector = collector.on("end", async (_, reason) => {
            try {
                await interaction.editReply({components: this.components})
            } catch (e) {
                if (!(e instanceof Error)) {
                    throw e
                }

                console.error("Unhandled exception", e, "when ending collector", collector, "with reason", reason)
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

    public addListener(listener: (collected: CollectedInteraction) => Promise<void>): InteractionCollectorHelper {
        this.collector.on("collect", async (collected) => {
            try {
                await listener(collected)
            } catch (e) {
                if (!(e instanceof Error)) {
                    console.error("Unhandled error", e, "on collected interaction", collected)
                    throw e
                }

                console.error(e)
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