import {BlockObjectRequest, BlockObjectResponse, FileBlockResponse, RichTextItemResponse} from "../types/notion"
import {
    APIEmbedField,
    bold,
    codeBlock,
    hyperlink,
    inlineCode,
    italic,
    strikethrough,
    time,
    underscore,
} from "discord.js"
import {DateTime} from "luxon"
import {WarnData} from "./responseUtilities"

export type ParseBlockObjectsResult = {
    fields: APIEmbedField[]
    unsupportedBlocks: number,
}

export default class NotionUtilities {
    static parseBlockObjects(blocks: BlockObjectResponse[]): ParseBlockObjectsResult {
        const fields = [
            {
                name: "",
                values: [] as string[],
            },
        ]
        let unsupportedBlocks = 0

        let currentListNumber = 1
        for (const block of blocks) {
            if (block.type !== "numbered_list_item") {
                currentListNumber = 1
            }

            const lastField = fields[fields.length - 1]
            switch (block.type) {
            case "paragraph":
                lastField.values.push(block.paragraph.rich_text.map(this.richTextToString).join(""))
                break
            case "heading_1":
                fields.push({
                    name: block.heading_1.rich_text.map(this.richTextToString).join(""),
                    values: [],
                })
                break
            case "heading_2":
                fields.push({
                    name: block.heading_2.rich_text.map(this.richTextToString).join(""),
                    values: [],
                })
                break
            case "heading_3":
                fields.push({
                    name: block.heading_3.rich_text.map(this.richTextToString).join(""),
                    values: [],
                })
                break
            case "bulleted_list_item":
                lastField.values.push(`• ${block.bulleted_list_item.rich_text.map(this.richTextToString)
                    .join("")}`)
                break
            case "numbered_list_item":
                lastField.values.push(`${currentListNumber}. ${block.numbered_list_item.rich_text
                    .map(this.richTextToString).join("")}`)
                currentListNumber++
                break
            case "quote":
                lastField.values.push(`> ${block.quote.rich_text.map(this.richTextToString).join("")}`)
                break
            case "to_do":
                lastField.values.push(`${block.to_do.checked ?
                    "✅" :
                    "🟩"} ${block.to_do.rich_text.map(this.richTextToString).join("")}`)
                break
            case "toggle":
                lastField.values.push(block.toggle.rich_text.map(this.richTextToString).join(""))
                break
            case "equation":
                lastField.values.push(inlineCode(block.equation.expression))
                break
            case "code":
                lastField.values.push(codeBlock(block.code.rich_text.map(this.richTextToString).join("")),
                    block.code.language)
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

                lastField.values.push(codeBlock(`${icon} ${block.callout.rich_text.map(this.richTextToString)
                    .join("")}`))
                break
            }
            case "embed": {
                let caption = block.embed.caption.map(this.richTextToString).join("")
                if (!caption) {
                    caption = "View embed"
                }

                lastField.values.push(hyperlink(caption, block.embed.url))
                break
            }
            case "bookmark": {
                let caption = block.bookmark.caption.map(this.richTextToString).join("")
                if (!caption) {
                    caption = "View bookmark"
                }

                lastField.values.push(hyperlink(caption, block.bookmark.url))
                break
            }
            case "image":
                lastField.values.push(this.generateHyperlink(block.image, "View image"))
                break
            case "video":
                lastField.values.push(this.generateHyperlink(block.video, "View video"))
                break
            case "pdf":
                lastField.values.push(this.generateHyperlink(block.pdf, "View PDF"))
                break
            case "file":
                lastField.values.push(this.generateHyperlink(block.file, "View file"))
                break
            case "audio":
                lastField.values.push(this.generateHyperlink(block.audio, "View audio"))
                break
            case "link_preview":
                lastField.values.push(hyperlink("View link", block.link_preview.url))
                break
            case "divider":
                lastField.values.push(`───`)
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
                unsupportedBlocks++
                break
            }
        }

        return {
            unsupportedBlocks: unsupportedBlocks,
            fields: fields.filter(f => f.name || f.values.length).map(f => {
                const value = f.values.join("\n")
                return {
                    name: f.name ? f.name : "\u200b",
                    value: value ? value : "\u200b",
                }
            }),
        }
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
                text = richText.plain_text
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
                                content: `Warned by ${data.warnedBy.tag} for ${data.reason} `,
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

        if (data.image) {
            objects.push({
                image: {
                    external: {
                        url: data.image,
                    },
                },
            })
        }

        return objects
    }
}