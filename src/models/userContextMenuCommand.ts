import {
    ContextMenuCommandBuilder,
    RESTPostAPIApplicationCommandsJSONBody,
    UserContextMenuCommandInteraction,
} from "discord.js"
import {Command} from "../interfaces/command"

export abstract class UserContextMenuCommand implements Command<UserContextMenuCommandInteraction> {
    public builder = new ContextMenuCommandBuilder()
    public handleAutocompleteInteraction = undefined

    protected constructor(name: string) {
        this.builder
            .setName(name)
    }

    public abstract handleCommandInteraction(interaction: UserContextMenuCommandInteraction): Promise<void>

    public toJSON(): RESTPostAPIApplicationCommandsJSONBody {
        return this.builder.toJSON()
    }
}