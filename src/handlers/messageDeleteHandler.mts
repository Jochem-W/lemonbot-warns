import { Prisma } from "../clients.mjs"
import type { Handler } from "../types/handler.mjs"
import type { Message, PartialMessage } from "discord.js"

export class MessageDeleteHandler implements Handler<"messageDelete"> {
  public readonly event = "messageDelete"
  public readonly once = false

  public async handle(message: Message | PartialMessage) {
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
