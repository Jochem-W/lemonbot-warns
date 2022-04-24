import {BlockObjectResponse, RichTextItemResponse} from "../types/notion"
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

export type ParsedObjectsResult = {
    fields: APIEmbedField[]
    unsupportedBlocks: number,
    firstImage?: string
}

export default class NotionHelper {
    static parseBlockObjects(blocks: BlockObjectResponse[]): ParsedObjectsResult {
        const fields = [
            {
                name: "",
                values: [] as string[],
            },
        ]
        let unsupportedBlocks = 0
        let firstImage

        let currentListNumber = 1
        for (const block of blocks) {
            if (block.type !== "numbered_list_item") {
                currentListNumber = 1
            }

            const lastField = fields[fields.length - 1]
            switch (block.type) {
            case "paragraph":
                lastField.values.push(block.paragraph.rich_text.map(NotionHelper.richTextToString).join(""))
                break
            case "heading_1":
                fields.push({
                    name: block.heading_1.rich_text.map(NotionHelper.richTextToString).join(""),
                    values: [],
                })
                break
            case "heading_2":
                fields.push({
                    name: block.heading_2.rich_text.map(NotionHelper.richTextToString).join(""),
                    values: [],
                })
                break
            case "heading_3":
                fields.push({
                    name: block.heading_3.rich_text.map(NotionHelper.richTextToString).join(""),
                    values: [],
                })
                break
            case "bulleted_list_item":
                lastField.values.push(`• ${block.bulleted_list_item.rich_text.map(NotionHelper.richTextToString)
                    .join("")}`)
                break
            case "numbered_list_item":
                lastField.values.push(`${currentListNumber}. ${block.numbered_list_item.rich_text.map(NotionHelper.richTextToString)
                    .join("")}`)
                currentListNumber++
                break
            case "quote":
                lastField.values.push(`> ${block.quote.rich_text.map(NotionHelper.richTextToString).join("")}`)
                break
            case "to_do":
                lastField.values.push(`${block.to_do.checked ?
                    "✅" :
                    "🟩"} ${block.to_do.rich_text.map(NotionHelper.richTextToString).join("")}`)
                break
            case "toggle":
                lastField.values.push(block.toggle.rich_text.map(NotionHelper.richTextToString).join(""))
                break
            case "template":
                unsupportedBlocks++
                break
            case "synced_block":
                unsupportedBlocks++
                break
            case "child_page":
                unsupportedBlocks++
                break
            case "child_database":
                unsupportedBlocks++
                break
            case "equation":
                lastField.values.push(inlineCode(block.equation.expression))
                break
            case "code":
                lastField.values.push(codeBlock(block.code.rich_text.map(NotionHelper.richTextToString).join("")),
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

                lastField.values.push(`${icon} ${block.callout.rich_text.map(NotionHelper.richTextToString).join("")}`)
                break
            }
            case "divider":
                unsupportedBlocks++
                break
            case "breadcrumb":
                unsupportedBlocks++
                break
            case "table_of_contents":
                unsupportedBlocks++
                break
            case "column_list":
                unsupportedBlocks++
                break
            case "column":
                unsupportedBlocks++
                break
            case "link_to_page":
                unsupportedBlocks++
                break
            case "table":
                unsupportedBlocks++
                break
            case "table_row":
                unsupportedBlocks++
                break
            case "embed": {
                let caption = block.embed.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View embed"
                }

                lastField.values.push(hyperlink(caption, block.embed.url))
                break
            }
            case "bookmark": {
                let caption = block.bookmark.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View bookmark"
                }

                lastField.values.push(hyperlink(caption, block.bookmark.url))
                break
            }
            case "image": {
                let caption = block.image.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View image"
                }

                let url
                switch (block.image.type) {
                case "external":
                    url = block.image.external.url
                    break
                case "file":
                    url = block.image.file.url
                    caption +=
                        ` (link expires ${time(DateTime.fromISO(block.image.file.expiry_time).toUnixInteger(), "R")})`
                    break
                }

                lastField.values.push(hyperlink(caption, url))
                if (!firstImage) {
                    firstImage = url
                }

                break
            }
            case "video": {
                let caption = block.video.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View image"
                }

                let url
                switch (block.video.type) {
                case "external":
                    url = block.video.external.url
                    break
                case "file":
                    url = block.video.file.url
                    caption +=
                        ` (link expires ${time(DateTime.fromISO(block.video.file.expiry_time).toUnixInteger(), "R")})`
                    break
                }

                lastField.values.push(hyperlink(caption, url))
                break
            }
            case "pdf": {
                let caption = block.pdf.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View PDF"
                }

                let url
                switch (block.pdf.type) {
                case "external":
                    url = block.pdf.external.url
                    break
                case "file":
                    url = block.pdf.file.url
                    caption +=
                        ` (link expires ${time(DateTime.fromISO(block.pdf.file.expiry_time).toUnixInteger(), "R")})`
                    break
                }

                lastField.values.push(hyperlink(caption, url))
                break
            }
            case "file": {
                let caption = block.file.caption.map(NotionHelper.richTextToString).join("")
                if (!caption) {
                    caption = "View file"
                }

                let url
                switch (block.file.type) {
                case "external":
                    url = block.file.external.url
                    break
                case "file":
                    url = block.file.file.url
                    caption +=
                        ` (link expires ${time(DateTime.fromISO(block.file.file.expiry_time).toUnixInteger(), "R")})`
                    break
                }

                lastField.values.push(hyperlink(caption, url))
                break
            }
            case "audio": {
                let caption = block.audio.caption.map(NotionHelper.richTextToString).join("") ?? "View audio"
                if (!caption) {
                    caption = "View audio"
                }

                let url
                switch (block.audio.type) {
                case "external":
                    url = block.audio.external.url
                    break
                case "file":
                    url = block.audio.file.url
                    caption +=
                        ` (link expires ${time(DateTime.fromISO(block.audio.file.expiry_time).toUnixInteger(), "R")})`
                    break
                }

                lastField.values.push(hyperlink(caption, url))
                break
            }
            case "link_preview":
                lastField.values.push(hyperlink("Link preview", block.link_preview.url))
                break
            case "unsupported":
                unsupportedBlocks++
                break
            }
        }

        return {
            unsupportedBlocks: unsupportedBlocks,
            fields: fields.filter(f => f.name || f.values.length).map(f => {
                const value = f.values.join("\n\n")
                return {
                    name: f.name ? f.name : "\u200b",
                    value: value ? value : "\u200b",
                }
            }),
            firstImage: firstImage,
        }
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
}