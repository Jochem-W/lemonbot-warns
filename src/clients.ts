import {Variables} from "./variables"
import {initializeApp} from "firebase-admin/app"
import {getStorage} from "firebase-admin/storage"
import {PrismaClient} from "@prisma/client"

export const Prisma = new PrismaClient()
export const StorageBucket = getStorage(initializeApp({storageBucket: Variables.storageBucket})).bucket()