import {Client} from "@notionhq/client";
import {Variables} from "./variables";

export const Notion = new Client({auth: Variables.notionToken})