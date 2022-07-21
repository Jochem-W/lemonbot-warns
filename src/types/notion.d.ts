import {
    AppendBlockChildrenParameters,
    AudioBlockObjectResponse,
    FileBlockObjectResponse,
    GetBlockResponse,
    PdfBlockObjectResponse,
    SelectPropertyItemObjectResponse,
    VideoBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints"

export type BlockObjectRequest = AppendBlockChildrenParameters["children"][0]
export type BlockObjectResponse = Extract<GetBlockResponse, { type: string }>
export type SelectPropertyResponse = NonNullable<SelectPropertyItemObjectResponse["select"]>
export type SelectPropertyRequest = Pick<SelectPropertyResponse, "name">
export type FileBlockObjectFileResponse =
    FileBlockObjectResponse["file"]
    | VideoBlockObjectResponse["video"]
    | PdfBlockObjectResponse["pdf"]
    | AudioBlockObjectResponse["audio"]
