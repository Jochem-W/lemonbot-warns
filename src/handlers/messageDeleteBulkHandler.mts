import { Prisma } from "../clients.mjs"
import type { Handler } from "../types/handler.mjs"
import type {
  Collection,
  GuildTextBasedChannel,
  Message,
  PartialMessage,
  Snowflake,
} from "discord.js"

export class MessageDeleteBulkHandler implements Handler<"messageDeleteBulk"> {
  public readonly event = "messageDeleteBulk"
  public readonly once = false

  public async handle(
    messages: Collection<Snowflake, Message | PartialMessage>,
    _channel: GuildTextBasedChannel
  ) {
    for (const [, message] of messages) {
      const prismaMessage = await Prisma.message.findFirst({
        where: { id: message.id },
      })
      if (!prismaMessage) {
        return
      }

      await Prisma.message.update({
        where: {
          id: message.id,
        },
        data: {
          deleted: true,
        },
      })
    }
  }
}
