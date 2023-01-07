import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"
import { Prisma } from "../clients.mjs"
import { isFromOwner } from "../utilities/interactionUtilities.mjs"
import { OwnerOnlyError } from "../errors.mjs"

export class DumpJsonCommand extends ChatInputCommand {
  public constructor() {
    super(
      "dump-json",
      "Save the warnings database as a JSON file",
      PermissionFlagsBits.Administrator
    )
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await isFromOwner(interaction))) {
      throw new OwnerOnlyError()
    }

    const users = await Prisma.user.findMany({
      include: {
        warnings: {
          include: {
            penalty: true,
            reasons: true,
          },
        },
        penaltyOverride: true,
      },
    })

    await interaction.editReply({
      files: [
        new AttachmentBuilder(Buffer.from(JSON.stringify(users, null, 4)), {
          name: "users.json",
        }),
      ],
    })
  }
}
