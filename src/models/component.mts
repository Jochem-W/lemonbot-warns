import { Components } from "../components.mjs"
import { ComponentTypeMismatchError, DuplicateNameError } from "../errors.mjs"
import {
  ComponentType,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
  RoleSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  ChannelSelectMenuInteraction,
  ButtonInteraction,
} from "discord.js"

// Please don't blatantly copy this. I worked very hard on everything.

type Interaction<T extends ComponentType> = T extends ComponentType.Button
  ? ButtonInteraction
  : T extends ComponentType.StringSelect
  ? StringSelectMenuInteraction
  : T extends ComponentType.UserSelect
  ? UserSelectMenuInteraction
  : T extends ComponentType.RoleSelect
  ? RoleSelectMenuInteraction
  : T extends ComponentType.MentionableSelect
  ? MentionableSelectMenuInteraction
  : T extends ComponentType.ChannelSelect
  ? ChannelSelectMenuInteraction
  : never

export type Component<T extends ComponentType> = {
  type: T
  handle: (interaction: Interaction<T>) => Promise<void>
}

export function staticComponent<T extends ComponentType, TT extends string>({
  type,
  name,
  handle,
}: {
  type: T
  name: TT
  handle: (interaction: Interaction<T>) => Promise<void>
}) {
  if (Components.has(name)) {
    throw new DuplicateNameError(name)
  }

  Components.set(name, {
    type,
    handle: async (interaction) => {
      if (interaction.componentType !== type) {
        throw new ComponentTypeMismatchError(
          name,
          type,
          interaction.componentType
        )
      }

      await handle(interaction as Interaction<T>)
    },
  })

  return name
}

export function component<
  T extends ComponentType,
  TT extends string,
  TTT extends readonly string[]
>({
  type,
  name,
  handle,
}: {
  type: T
  name: TT
  handle: (interaction: Interaction<T>, ...args: TTT) => Promise<void>
}) {
  if (Components.has(name)) {
    throw new DuplicateNameError(name)
  }

  Components.set(name, {
    type,
    handle: async (interaction) => {
      if (interaction.componentType !== type) {
        throw new ComponentTypeMismatchError(
          name,
          type,
          interaction.componentType
        )
      }

      await handle(
        interaction as Interaction<T>,
        ...(interaction.customId.split(":").slice(1) as [...TTT])
      )
    },
  })

  function generateCustomId(...args: TTT) {
    return `${name}:${args.join(":")}`
  }

  return generateCustomId
}
