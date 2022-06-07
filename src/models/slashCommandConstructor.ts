import {
    ApplicationCommandOptionChoiceData,
    AutocompleteInteraction,
    CommandInteraction,
    InteractionCollector,
    InteractionDeferReplyOptions,
    MessageComponentInteraction,
    ModalSubmitInteraction,
    PermissionResolvable,
    SlashCommandBuilder,
} from "discord.js"
import ExecutableCommand from "./executableCommand"
import CommandConstructor from "./commandConstructor"
import {CustomId, InteractionScope, parseCustomId} from "./customId"

/**
 * A constructor for a command that can be executed by a user.
 */
export default abstract class SlashCommandConstructor<I extends CommandInteraction> implements CommandConstructor<I> {
    readonly commandBuilder = new SlashCommandBuilder()
    readonly name: string
    readonly memberPermissions?: PermissionResolvable
    readonly commandType: { new(interaction: I): ExecutableCommand<I> }

    /**
     * Creates an instance of CommandConstructor.
     * @param command
     * @param name The name of the command.
     * @param description The description of the command.
     * @param memberPermissions The permissions required to run the command.
     * @protected
     */
    protected constructor(command: { new(interaction: I): ExecutableCommand<I> },
                          name: string,
                          description: string,
                          memberPermissions?: PermissionResolvable) {
        this.commandType = command
        this.name = name
        this.commandBuilder
            .setName(name)
            .setDescription(description)
            .setDMPermission(false)
            .setDefaultMemberPermissions(memberPermissions?.toString())
    }

    /**
     * Return the command data that can be sent to Discord.
     */
    build() {
        return this.commandBuilder.toJSON()
    }

    /**
     * Function that will be called on every AutocompleteInteraction.
     * @param interaction The interaction that was triggered by autocompletion.
     */
    async getAutocomplete(interaction: AutocompleteInteraction): Promise<ApplicationCommandOptionChoiceData[]> {
        return []
    }

    /**
     * Registers an InteractionCollector for this command.
     * @param interaction
     * @param options The options for deferring the reply.
     * @protected
     */
    async execute(interaction: I, options?: InteractionDeferReplyOptions) {
        const command = new this.commandType(interaction)
        new InteractionCollector(command.interaction.client, {
            guild: command.interaction.guild ?? command.interaction.guildId ?? undefined,
            channel: command.interaction.channel ?? command.interaction.channelId ?? undefined,
            message: await command.interaction.deferReply({...options, fetchReply: true}),
            dispose: true,
            idle: 600000,
        }).on("collect", async collected => {
            if (collected.isMessageComponent()) {
                const data = parseCustomId(collected.customId)
                if (data.scope !== InteractionScope.Collector) {
                    return
                }

                await command.handleMessageComponent(collected, data)
                return
            }

            if (collected.isModalSubmit()) {
                const data = parseCustomId(collected.customId)
                if (data.scope !== InteractionScope.Collector) {
                    return
                }

                await command.handleModalSubmit(collected, data)
                return
            }

            throw new Error(`Unexpected interaction ${collected} on command ${command}`)
        }).on("end", async () => {
            await command.cleanup()
        })

        await command.execute()
    }

    async handleMessageComponent(interaction: MessageComponentInteraction, data: CustomId) {
    }

    async handleModalSubmit(interaction: ModalSubmitInteraction, data: CustomId) {
    }
}