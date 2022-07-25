# Set-up build image
FROM node:current-alpine AS builder
ARG commit_hash
ENV NODE_ENV=development
WORKDIR /app

# Copy package.json, lockfile and .npmrc
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "./"]

# Install dependencies
RUN apk add --no-cache alpine-sdk python3 && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN pnpm tsc && \
    pnpm prune --prod


# Set-up running image
FROM node:current-alpine
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash
WORKDIR /app

# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["node", "dist/index.js"]