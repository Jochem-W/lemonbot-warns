# Set-up build image
FROM node:19-alpine AS builder
ENV NODE_ENV=development

WORKDIR /app

# Copy package.json, lockfile, .npmrc and prisma
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "prisma", "./"]

# Install dependencies
RUN apk add --no-cache alpine-sdk openssl python3

RUN npm install -g pnpm

RUN pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN pnpm prisma generate

RUN pnpm tsc

RUN pnpm prune --prod

# Set-up running image
FROM node:19-alpine
ARG commit_hash
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash
WORKDIR /app

# Install openssl
RUN apk add --no-cache openssl

# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["node", "dist/index.js"]
