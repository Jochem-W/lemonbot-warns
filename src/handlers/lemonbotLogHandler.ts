import type {Handler} from "../interfaces/handler"
import type {Message} from "discord.js"
import {DefaultConfig} from "../models/config"
import {Prisma} from "../clients"
import type {Penalty} from "@prisma/client"

export class LemonbotLogHandler implements Handler<"messageCreate"> {
    public readonly event = "messageCreate"
    public readonly once = false

    public async handle(message: Message): Promise<void> {
        if (message.channelId !== DefaultConfig.guild.warnLogsChannel || !message.author.bot) {
            return
        }

        const embed = message.embeds.pop()
        if (!embed?.author || !embed.footer) {
            return
        }

        const authorMatch = embed.author.name.match(/([^#]{2,32}#\d{4}) \((\d+)\) (\w+) ([^#]{2,32}#\d{4}) \((\d+)\)!/)
        if (!authorMatch) {
            return
        }

        const footerMatch = embed.footer.text.match(/.+ Notify Message (.+)/)
        if (!footerMatch) {
            return
        }

        const sourceId = authorMatch[2]
        const targetId = authorMatch[5]
        if (!sourceId || !targetId) {
            await message.react("❌")
            return
        }

        const penalties = await Prisma.penalty.findMany() // This is suboptimal

        let penalty: Penalty | undefined = undefined
        switch (authorMatch[3]) {
            case "banned":
                penalty = penalties.find(p => p.ban)
                break
            case "kicked":
                penalty = penalties.find(p => p.kick)
                break
            default:
                await message.react("❌")
                return
        }

        if (!penalty) {
            await message.react("❌")
            return
        }

        const descriptionMatch = embed.description?.match(/\*\*\*Reason:\*\* (.+)\*/)
        await Prisma.warning.create({
            data: {
                createdAt: message.createdAt,
                createdBy: sourceId,
                description: descriptionMatch ? descriptionMatch[1] : null,
                silent: footerMatch[1] !== "not sent",
                penalty: {
                    connect: {
                        id: penalty.id,
                    },
                },
                user: {
                    connectOrCreate: {
                        where: {
                            discordId: targetId,
                        },
                        create: {
                            discordId: targetId,
                            priority: false,
                        },
                    },
                },
            },
        })

        await message.react("✅")
    }
}
