import {BlockObjectRequest, BlockObjectResponse, FileBlockResponse, RichTextItemResponse} from "../types/notion"
import {
    bold,
    codeBlock,
    EmbedBuilder,
    hyperlink,
    inlineCode,
    italic,
    strikethrough,
    time,
    underscore,
} from "discord.js"
import {DateTime} from "luxon"
import {NoteData, WarnData} from "./responseUtilities"
import InteractionUtilities from "./interactionUtilities"

export type ParseBlockObjectsResult = {
    embeds: EmbedBuilder[]
    unsupportedBlocks: number,
}

export default class NotionUtilities {
    static parseBlockObjects(blocks: BlockObjectResponse[]): ParseBlockObjectsResult {
        const result: ParseBlockObjectsResult = {
            embeds: [new EmbedBuilder().setFields([{
                name: " ",
                value: " ",
            }])],
            unsupportedBlocks: 0,
        }

        let currentListNumber = 1
        for (const block of blocks) {
            if (block.type !== "numbered_list_item") {
                currentListNumber = 1
            }

            let lastEmbed = result.embeds.at(-1)
            if (!lastEmbed) {
                throw new Error("No embed found")
            }
            if (lastEmbed.data.fields?.length === 25 || lastEmbed.data.image) {
                lastEmbed = new EmbedBuilder().setFields([{
                    name: " ",
                    value: " ",
                }])
                result.embeds.push(lastEmbed)
            }
            const lastField = lastEmbed.data.fields?.at(-1)

            if (!lastField) {
                throw new Error("No field found")
            }

            switch (block.type) {
            case "paragraph":
                lastField.value += `${block.paragraph.rich_text.map(this.richTextToString).join("")}\n`
                break
            case "heading_1":
                lastEmbed.addFields([{
                    name: block.heading_1.rich_text.map(this.richTextToString).join(""),
                    value: " ",
                }])
                break
            case "heading_2":
                lastEmbed.addFields([{
                    name: block.heading_2.rich_text.map(this.richTextToString).join(""),
                    value: " ",
                }])
                break
            case "heading_3":
                lastEmbed.addFields([{
                    name: block.heading_3.rich_text.map(this.richTextToString).join(""),
                    value: " ",
                }])
                break
            case "bulleted_list_item":
                lastField.value += `• ${block.bulleted_list_item.rich_text.map(this.richTextToString).join("")}\n`
                break
            case "numbered_list_item":
                lastField.value +=
                    `${currentListNumber}. ${block.numbered_list_item.rich_text.map(this.richTextToString).join("")}\n`
                currentListNumber++
                break
            case "quote":
                lastField.value += `> ${block.quote.rich_text.map(this.richTextToString).join("")}\n`
                break
            case "to_do":
                lastField.value +=
                    `${block.to_do.checked ? "✅" : "🟩"} ${block.to_do.rich_text.map(this.richTextToString).join("")}\n`
                break
            case "toggle":
                lastField.value += `${block.toggle.rich_text.map(this.richTextToString).join("")}\n`
                break
            case "equation":
                lastField.value += `${inlineCode(block.equation.expression)}\n`
                break
            case "code":
                lastField.value +=
                    `${codeBlock(block.code.rich_text.map(this.richTextToString).join(""), block.code.language)}\n`
                break
            case "callout": {
                let icon
                switch (block.callout.icon?.type) {
                case "emoji":
                    icon = block.callout.icon.emoji
                    break
                default:
                    icon = "❗"
                    break
                }

                lastField.value +=
                    `${codeBlock(`${icon} ${block.callout.rich_text.map(this.richTextToString).join("")}`)}\n`
                break
            }
            case "embed": {
                let caption = block.embed.caption.map(this.richTextToString).join("")
                if (!caption) {
                    caption = "View embed"
                }

                lastField.value += `${hyperlink(caption, block.embed.url)}\n`
                break
            }
            case "bookmark": {
                let caption = block.bookmark.caption.map(this.richTextToString).join("")
                if (!caption) {
                    caption = "View bookmark"
                }

                lastField.value += `${hyperlink(caption, block.bookmark.url)}\n`
                break
            }
            case "image":
                switch (block.image.type) {
                case "external":
                    lastEmbed.setImage(block.image.external.url)
                    break
                case "file":
                    lastEmbed.setImage(block.image.file.url)
                    break
                }

                break
            case "video":
                lastField.value += `${this.generateHyperlink(block.video, "View video")}\n`
                break
            case "pdf":
                lastField.value += `${this.generateHyperlink(block.pdf, "View PDF")}\n`
                break
            case "file":
                lastField.value += `${this.generateHyperlink(block.file, "View file")}\n`
                break
            case "audio":
                lastField.value += `${this.generateHyperlink(block.audio, "View audio")}\n`
                break
            case "link_preview":
                lastField.value += `${hyperlink("View link", block.link_preview.url)}\n`
                break
            case "divider":
                lastField.value += "───\n"
                break
            case "unsupported":
            case "template":
            case "synced_block":
            case "child_page":
            case "child_database":
            case "breadcrumb":
            case "table_of_contents":
            case "column_list":
            case "column":
            case "link_to_page":
            case "table":
            case "table_row":
                result.unsupportedBlocks++
                break
            }
        }

        for (let i = 0; i < result.embeds.length; i++) {
            const embed = result.embeds[i]
            if (!embed?.data.fields) {
                throw new Error("No fields found")
            }

            for (let j = 0; j < embed.data.fields.length; j++) {
                const field = embed.data.fields[j]
                if (!field) {
                    throw new Error("No field found")
                }

                field.name = field.name.trim()
                field.value = field.value.trim()

                if (!field.name && !field.value) {
                    embed.data.fields.splice(j, 1)
                    j--
                    continue
                }

                if (!field.name) {
                    field.name = "\u200b"
                }

                if (!field.value) {
                    field.value = "\u200b"
                }
            }

            if (embed.data.fields.length === 0 && !embed.data.image) {
                result.embeds.splice(i, 1)
                i--
            }
        }

        result.embeds = result.embeds.slice(0, 9)

        return result
    }

    static generateHyperlink(file: FileBlockResponse, defaultCaption: string): string {
        let caption = file.caption.map(this.richTextToString).join("")
        if (!caption) {
            caption = defaultCaption
        }

        let url
        switch (file.type) {
        case "external":
            url = file.external.url
            break
        case "file":
            url = file.file.url
            caption +=
                ` (link expires ${time(DateTime.fromISO(file.file.expiry_time).toUnixInteger(), "R")})`
            break
        }

        return hyperlink(caption, url)
    }

    static richTextToString(richText: RichTextItemResponse): string {
        let text
        switch (richText.type) {
        case "text":
            text = richText.text.link ? hyperlink(richText.text.content, richText.text.link.url) : richText.text.content
            break
        case "mention":
            switch (richText.mention.type) {
            case "user":
                text = inlineCode(richText.plain_text)
                break
            case "date":
                text = time(DateTime.fromISO(richText.mention.date.start).toSeconds(), "R")
                break
            case "link_preview":
                text = hyperlink(richText.plain_text, richText.mention.link_preview.url)
                break
            case "template_mention":
                return ""
            case "page":
                return ""
            case "database":
                return ""
            }
            break
        case "equation":
            text = inlineCode(richText.equation.expression)
            break
        }

        if (richText.annotations.code) {
            text = inlineCode(text)
        }

        if (richText.annotations.bold) {
            text = bold(text)
        }

        if (richText.annotations.italic) {
            text = italic(text)
        }

        if (richText.annotations.strikethrough) {
            text = strikethrough(text)
        }

        if (richText.annotations.underline) {
            text = underscore(text)
        }

        return text
    }

    static generateWarnNote(data: WarnData): BlockObjectRequest[] {
        const objects: BlockObjectRequest[] = [
            {
                heading_1: {
                    rich_text: [
                        {
                            text: {
                                content: `Warned by ${data.warnedBy.tag} for ${data.reasons.join(", ")} `,
                            },
                        },
                        {
                            mention: {
                                date: {
                                    start: data.timestamp.toISO(),
                                },
                            },
                        },
                    ],
                },
            },
            {
                paragraph: {
                    rich_text: [
                        {
                            text: {
                                content: data.description,
                            },
                        },
                    ],
                },
            },
        ]

        for (const image of data.images) {
            objects.push({
                image: {
                    external: {
                        url: image,
                    },
                },
            })
        }

        return objects
    }

    static async generateNote(data: NoteData): Promise<BlockObjectRequest[]> {
        const objects: BlockObjectRequest[] = []
        if (data.title) {
            objects.push({
                heading_1: {
                    rich_text: [{
                        text: {
                            content: data.title,
                        },
                    }],
                },
            })
        }

        objects.push({
            paragraph: {
                rich_text: [{
                    text: {
                        content: data.body,
                    },
                }],
            },
        })

        if (data.attachment) {
            const result = await InteractionUtilities.uploadAttachment(data.attachment)
            switch (result.type) {
            case "image":
                objects.push({
                    image: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "video":
                objects.push({
                    video: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "audio":
                objects.push({
                    audio: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            case "application":
                if (result.subtype === "pdf") {
                    objects.push({
                        pdf: {
                            external: {
                                url: result.url,
                            },
                        },
                    })
                    break
                } else {
                    objects.push({
                        file: {
                            external: {
                                url: result.url,
                            },
                        },
                    })
                }

                break
            default:
                objects.push({
                    file: {
                        external: {
                            url: result.url,
                        },
                    },
                })
                break
            }
        }

        return objects
    }
}