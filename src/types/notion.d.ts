import {GetBlockResponse} from "@notionhq/client/build/src/api-endpoints"

export type BlockObjectResponse = Extract<GetBlockResponse, { type: string }>
export type RichTextItemResponse = Extract<GetBlockResponse, { type: "paragraph" }>["paragraph"]["rich_text"][0]
