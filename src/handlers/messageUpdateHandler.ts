import type { Handler } from "../interfaces/handler"
import type { Message, PartialMessage } from "discord.js"
import { Prisma } from "../clients"

export class MessageUpdateHandler implements Handler<"messageUpdate"> {
  public readonly event = "messageUpdate"
  public readonly once = false

  public async handle(
    _oldMessage: Message | PartialMessage,
    newMessage: Message | PartialMessage
  ) {
    const prismaMessage = await Prisma.message.findFirst({
      where: { id: newMessage.id },
    })
    if (!prismaMessage) {
      return
    }

    newMessage = newMessage.partial ? await newMessage.fetch() : newMessage

    await Prisma.messageRevision.create({
      data: {
        message: {
          connect: {
            id: newMessage.id,
          },
        },
        content: newMessage.content,
        timestamp: newMessage.editedAt ?? new Date(),
      },
    })
  }
}
