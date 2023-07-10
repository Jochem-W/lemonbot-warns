import { RegisteredCommands } from "../../commands.mjs"
import { Components } from "../../components.mjs"
import {
  CommandNotFoundError,
  CommandTypeMismatchError,
  ComponentTypeMismatchError,
  InvalidCustomIdError,
  ModalNotFoundError,
  logError,
} from "../../errors.mjs"
import { Modals } from "../../modals.mjs"
import { handler } from "../../models/handler.mjs"
import { makeErrorMessage } from "../../utilities/embedUtilities.mjs"
import {
  AutocompleteInteraction,
  CommandInteraction,
  InteractionType,
  MessageComponentInteraction,
  ModalSubmitInteraction,
} from "discord.js"

async function handleCommand(interaction: CommandInteraction) {
  const command = RegisteredCommands.get(interaction.commandId)
  if (!command) {
    throw new CommandNotFoundError(interaction.commandId)
  }

  if (command.type !== interaction.commandType) {
    throw new CommandTypeMismatchError(
      interaction.commandId,
      interaction.commandType,
      command.type
    )
  }

  await command.handle(interaction as never)
}

async function handleComponent(interaction: MessageComponentInteraction) {
  const [componentName] = interaction.customId.split(":")
  if (!componentName) {
    throw new InvalidCustomIdError(interaction.customId)
  }

  const component = Components.get(componentName)
  if (!component) {
    throw new CommandNotFoundError(componentName)
  }

  if (component.type !== interaction.componentType) {
    throw new ComponentTypeMismatchError(
      componentName,
      interaction.componentType,
      component.type
    )
  }

  await component.handle(interaction as never)
}

async function handleAutocomplete(interaction: AutocompleteInteraction) {
  const command = RegisteredCommands.get(interaction.commandId)
  if (!command) {
    throw new CommandNotFoundError(interaction.commandId)
  }

  if (command.type !== interaction.commandType) {
    throw new CommandTypeMismatchError(
      interaction.commandId,
      interaction.commandType,
      command.type
    )
  }

  await command.autocomplete(interaction)
}

async function handleModal(interaction: ModalSubmitInteraction) {
  const [modalName] = interaction.customId.split(":")
  if (!modalName) {
    throw new InvalidCustomIdError(interaction.customId)
  }

  const modal = Modals.get(modalName)
  if (!modal) {
    throw new ModalNotFoundError(modalName)
  }

  await modal(interaction)
}

export const InteractionHandler = handler({
  event: "interactionCreate",
  once: false,
  async handle(interaction) {
    try {
      switch (interaction.type) {
        case InteractionType.ApplicationCommand:
          await handleCommand(interaction)
          break
        case InteractionType.MessageComponent:
          await handleComponent(interaction)
          break
        case InteractionType.ApplicationCommandAutocomplete:
          await handleAutocomplete(interaction)
          break
        case InteractionType.ModalSubmit:
          await handleModal(interaction)
          break
      }
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e
      }

      await logError(interaction.client, e)

      if (!interaction.isRepliable()) {
        return
      }

      const message = makeErrorMessage(e)
      if (interaction.replied) {
        await interaction.editReply(message)
        return
      }

      await interaction.reply({ ...message, ephemeral: true })
    }
  },
})
