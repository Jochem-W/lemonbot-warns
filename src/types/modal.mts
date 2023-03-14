import type { CustomId } from "../models/customId.mjs"
import type { ModalSubmitInteraction } from "discord.js"

export type Modal = {
  readonly name: string

  handle(interaction: ModalSubmitInteraction, customId: CustomId): Promise<void>
}
