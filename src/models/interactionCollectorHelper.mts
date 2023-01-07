import {
  ActionRowBuilder,
  CollectedInteraction,
  CommandInteraction,
  InteractionCollector,
  InteractionCollectorOptions,
  InteractionReplyOptions,
  MessageActionRowComponentBuilder,
  WebhookEditMessageOptions,
} from "discord.js"
import { Duration } from "luxon"
import { reportError } from "../errors.mjs"
import { makeErrorEmbed } from "../utilities/responseBuilder.mjs"

export class InteractionCollectorHelper {
  private collector: InteractionCollector<CollectedInteraction>
  private components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = []
  private interaction: CommandInteraction

  private constructor(
    interaction: CommandInteraction,
    collector: InteractionCollector<CollectedInteraction>
  ) {
    this.interaction = interaction
    this.collector = collector.on("end", async () => {
      try {
        await interaction.editReply({ components: this.components })
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(interaction.client, e)
      }
    })
  }

  public static async create(
    interaction: CommandInteraction
  ): Promise<InteractionCollectorHelper> {
    const options: InteractionCollectorOptions<CollectedInteraction> = {
      channel: interaction.channel ?? interaction.channelId,
      message: await interaction.fetchReply(),
      idle: Duration.fromDurationLike({ minutes: 15 }).toMillis(),
      dispose: true,
    }

    if (interaction.inGuild()) {
      options.guild = interaction.guild ?? interaction.guildId
    }

    const collector = new InteractionCollector(interaction.client, options)

    return new InteractionCollectorHelper(interaction, collector)
  }

  public addListener(
    listener: (collected: CollectedInteraction) => Promise<void>
  ): this {
    this.collector.on("collect", async (collected) => {
      try {
        await listener(collected)
      } catch (e) {
        if (!(e instanceof Error)) {
          throw e
        }

        await reportError(this.interaction.client, e)

        const message: InteractionReplyOptions = {
          embeds: [makeErrorEmbed(e)],
        }

        if (this.interaction.ephemeral) {
          message.ephemeral = true
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

  public updateComponents(
    components: WebhookEditMessageOptions["components"]
  ): void {
    this.components =
      components?.map((row) => {
        let builder: ActionRowBuilder<MessageActionRowComponentBuilder>
        if ("toJSON" in row) {
          builder = new ActionRowBuilder<MessageActionRowComponentBuilder>(
            row.toJSON()
          )
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
