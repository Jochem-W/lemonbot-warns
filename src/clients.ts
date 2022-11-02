import {Variables} from "./variables"
import {PrismaClient} from "@prisma/client"
import {S3Client} from "@aws-sdk/client-s3"
import {NodeHttpHandler} from "@aws-sdk/node-http-handler"
import {Agent} from "https"

export const Prisma = new PrismaClient()
export const S3 = new S3Client({
    region: Variables.s3Region,
    endpoint: Variables.s3Endpoint,
    credentials: {
        accessKeyId: Variables.s3AccessKeyId,
        secretAccessKey: Variables.s3SecretAccessKey,
    },
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 5000,
        socketTimeout: 10000,
        httpsAgent: new Agent({
            keepAlive: true,
            maxCachedSessions: 1000,
        }),
    }),
})
