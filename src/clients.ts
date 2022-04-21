import {Client} from "@notionhq/client"
import {Variables} from "./variables"
import * as firebase from "firebase-admin"

export const Notion = new Client({auth: Variables.notionToken})
export const StorageBucket = firebase.initializeApp({storageBucket: Variables.storageBucket}).storage().bucket()