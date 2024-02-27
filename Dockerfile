# Set-up build image
FROM node:21-alpine AS builder
ENV NODE_ENV=development

WORKDIR /app

# Copy package.json, lockfile, .npmrc and prisma
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "prisma", "./"]

# Install build tools
RUN apk add --no-cache alpine-sdk python3 openssl && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN pnpm prisma generate && \
    pnpm tsc && \
    pnpm prune --prod

# Set-up running image
FROM node:21-alpine
ARG commit_hash
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash
WORKDIR /app

# Install openssl
RUN apk add --no-cache openssl

# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["node", "dist/index.mjs"]
