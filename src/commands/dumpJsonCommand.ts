import {ChatInputCommand} from "../models/chatInputCommand"
import {AttachmentBuilder, ChatInputCommandInteraction, PermissionFlagsBits} from "discord.js"
import {Prisma} from "../clients"

export class DumpJsonCommand extends ChatInputCommand {
    public constructor() {
        super("dump-json", "Save the warnings database as a JSON file", PermissionFlagsBits.Administrator)
    }

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const warnings = await Prisma.user.findMany({
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

        await interaction.editReply({files: [new AttachmentBuilder(JSON.stringify(warnings, null, 4))]})
    }
}