import {BlockObjectResponse, RichTextItemResponse} from "@notionhq/client/build/src/api-endpoints"
import {
    bold,
    codeBlock,
    EmbedBuilder,
    GuildMember,
    hyperlink,
    inlineCode,
    italic,
    strikethrough,
    time,
    underscore,
    User,
} from "discord.js"
import {DateTime} from "luxon"
import {ResponseOptions, WarnCommand} from "../commands/warnCommand"
import {BlockObjectRequest, FileBlockObjectFileResponse} from "../types/notion"
import {InvalidEmbedError} from "../errors"

export interface ParseBlockObjectsResult {
    embeds: EmbedBuilder[]
    unsupportedBlocks: number,
}

interface InternalParseBlockObjectsResult extends ParseBlockObjectsResult {
    currentListNumber: number,
}

// TODO: check embed lengths and create additional messages
export async function parseBlockObjects(blocks: BlockObjectResponse[] | AsyncGenerator<BlockObjectResponse>): Promise<ParseBlockObjectsResult> {
    let result: InternalParseBlockObjectsResult = {
        embeds: [new EmbedBuilder().setFields([{
            name: " ",
            value: " ",
        }])],
        unsupportedBlocks: 0,
        currentListNumber: 1,
    }

    if (blocks instanceof Array) {
        for (const block of blocks) {
            result = parseBlockObject(block, result)
        }
    } else {
        for await (const block of blocks) {
            result = parseBlockObject(block, result)
        }
    }

    for (let i = 0; i < result.embeds.length; i++) {
        const embed = result.embeds[i]
        if (!embed?.data.fields) {
            throw new InvalidEmbedError("No fields found")
        }

        for (let j = 0; j < embed.data.fields.length; j++) {
            const field = embed.data.fields[j]
            if (!field) {
                throw new InvalidEmbedError("No field found")
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

    return result
}

export function generateHyperlink(file: FileBlockObjectFileResponse, defaultCaption: string): string {
    let caption = file.caption.map(text => richTextToString(text)).join("")
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

export function richTextToString(richText: RichTextItemResponse): string {
    let text
    switch (richText.type) {
        case "text":
            text = richText.text.link ? hyperlink(richText.text.content, richText.text.link.url) :
                richText.text.content
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

export function formatName(user: GuildMember | User) {
    if (user instanceof GuildMember) {
        return user.nickname ? `${user.user.tag} [${user.nickname}]` : user.user.tag
    }

    return user.tag
}

export function generateWarnNote(data: ResponseOptions): BlockObjectRequest[] {
    const objects: BlockObjectRequest[] = [
        {
            heading_1: {
                rich_text: [
                    {
                        text: {
                            content: WarnCommand.formatTitle(data, {includeReasons: true}) + " ",
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

function parseBlockObject(block: BlockObjectResponse,
                          result: InternalParseBlockObjectsResult): InternalParseBlockObjectsResult {
    if (block.type !== "numbered_list_item") {
        result.currentListNumber = 1
    }

    let lastEmbed = result.embeds.at(-1)
    if (!lastEmbed) {
        throw new InvalidEmbedError("No embed found")
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
        throw new InvalidEmbedError("No field found")
    }

    switch (block.type) {
        case "paragraph":
            lastField.value += `${block.paragraph.rich_text.map(text => richTextToString(text)).join("")}\n`
            break
        case "heading_1":
            lastEmbed.addFields([{
                name: block.heading_1.rich_text.map(text => richTextToString(text)).join(""),
                value: " ",
            }])
            break
        case "heading_2":
            lastEmbed.addFields([{
                name: block.heading_2.rich_text.map(text => richTextToString(text)).join(""),
                value: " ",
            }])
            break
        case "heading_3":
            lastEmbed.addFields([{
                name: block.heading_3.rich_text.map(text => richTextToString(text)).join(""),
                value: " ",
            }])
            break
        case "bulleted_list_item":
            lastField.value +=
                `• ${block.bulleted_list_item.rich_text.map(text => richTextToString(text)).join("")}\n`
            break
        case "numbered_list_item":
            lastField.value +=
                `${result.currentListNumber}. ${block.numbered_list_item.rich_text.map(text => richTextToString(
                    text)).join("")}\n`
            result.currentListNumber++
            break
        case "quote":
            lastField.value += `> ${block.quote.rich_text.map(text => richTextToString(text)).join("")}\n`
            break
        case "to_do":
            lastField.value +=
                `${block.to_do.checked ?
                    "✅" :
                    "🟩"} ${block.to_do.rich_text.map(text => richTextToString(text))
                    .join("")}\n`
            break
        case "toggle":
            lastField.value += `${block.toggle.rich_text.map(text => richTextToString(text)).join("")}\n`
            break
        case "equation":
            lastField.value += `${inlineCode(block.equation.expression)}\n`
            break
        case "code":
            lastField.value +=
                `${codeBlock(block.code.rich_text.map(text => richTextToString(text)).join(""),
                    block.code.language)}\n`
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
                `${codeBlock(`${icon} ${block.callout.rich_text.map(text => richTextToString(text))
                    .join("")}`)}\n`
            break
        }
        case "embed": {
            let caption = block.embed.caption.map(text => richTextToString(text)).join("")
            if (!caption) {
                caption = "View embed"
            }

            lastField.value += `${hyperlink(caption, block.embed.url)}\n`
            break
        }
        case "bookmark": {
            let caption = block.bookmark.caption.map(text => richTextToString(text)).join("")
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
            lastField.value += `${generateHyperlink(block.video, "View video")}\n`
            break
        case "pdf":
            lastField.value += `${generateHyperlink(block.pdf, "View PDF")}\n`
            break
        case "file":
            lastField.value += `${generateHyperlink(block.file, "View file")}\n`
            break
        case "audio":
            lastField.value += `${generateHyperlink(block.audio, "View audio")}\n`
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

    return result
}
