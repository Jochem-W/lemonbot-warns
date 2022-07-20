import {
    AppendBlockChildrenParameters,
    GetBlockResponse,
    GetPagePropertyResponse,
} from "@notionhq/client/build/src/api-endpoints"

export type BlockObjectResponse = Extract<GetBlockResponse, { type: string }>
export type RichTextItemResponse = Extract<GetBlockResponse, { type: "paragraph" }>["paragraph"]["rich_text"][0]
export type FileBlockResponse = Extract<BlockObjectResponse, { type: "file" }>["file"]
export type BlockObjectRequest = AppendBlockChildrenParameters["children"][0]
export type SelectPropertyResponse = NonNullable<Extract<GetPagePropertyResponse, { type: "select" }>["select"]>
export type SelectPropertyRequest = Pick<SelectPropertyResponse, "id">
export type PagePropertyItemResponse = Extract<GetPagePropertyResponse, { object: "property_item" }>