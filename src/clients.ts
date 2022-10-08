import {Variables} from "./variables"
import {initializeApp} from "firebase-admin/app"
import {getStorage} from "firebase-admin/storage"
import {PrismaClient} from "@prisma/client"
import {S3Client} from "@aws-sdk/client-s3"

export const Prisma = new PrismaClient()
export const StorageBucket = getStorage(initializeApp({storageBucket: Variables.storageBucket})).bucket()
export const S3 = new S3Client({
    region: "auto",
    endpoint: `https://${Variables.s3AccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: Variables.s3AccessKeyId,
        secretAccessKey: Variables.s3SecretAccessKey,
    },
})
