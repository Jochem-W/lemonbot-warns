import {
    ContextMenuCommandBuilder,
    MessageContextMenuCommandInteraction,
    RESTPostAPIApplicationCommandsJSONBody,
} from "discord.js"
import {Command} from "../interfaces/command"

export abstract class MessageContextMenuCommand implements Command<MessageContextMenuCommandInteraction> {
    public builder = new ContextMenuCommandBuilder()
    public handleAutocompleteInteraction = undefined

    protected constructor(name: string) {
        this.builder
            .setName(name)
    }

    public abstract handleCommandInteraction(interaction: MessageContextMenuCommandInteraction): Promise<void>

    public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
        return this.builder.toJSON()
    }
}