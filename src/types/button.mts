import type { CustomId } from "../models/customId.mjs"
import type { ButtonInteraction } from "discord.js"

export type Button = {
  readonly name: string

  handle(interaction: ButtonInteraction, customId: CustomId): Promise<void>
}
