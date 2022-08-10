FROM rust:alpine as prisma
ENV RUSTFLAGS="-C target-feature=-crt-static"
WORKDIR /app

COPY ["package.json", "./"]

RUN apk add --no-cache alpine-sdk openssl-dev perl protoc && \
    wget -qO- https://github.com/prisma/prisma-engines/archive/refs/tags/4.2.0.tar.gz | tar xz --strip-components=1 -C /app && \
    source .envrc && \
    cargo build --release

# Set-up build image
FROM node:current-alpine AS builder
ENV NODE_ENV=development \
    PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
    PRISMA_CLIENT_ENGINE_TYPE=binary \
    PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
    PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
    PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
    PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt

WORKDIR /app

# Copy package.json, lockfile and .npmrc
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "./"]

# Install dependencies
RUN apk add --no-cache alpine-sdk python3 && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Copy Prisma engines
COPY --from=prisma ["/app/target/release/query-engine", "/app/target/release/migration-engine", "/app/target/release/introspection-engine", "/app/target/release/prisma-fmt", "/prisma-engines/"]

# Compile Typescript and remove dev packages
RUN pnpm tsc && \
    pnpm prisma generate && \
    pnpm prune --prod


# Set-up running image
FROM node:current-alpine
ARG commit_hash
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash \
    PRISMA_CLI_QUERY_ENGINE_TYPE=binary \
    PRISMA_CLIENT_ENGINE_TYPE=binary \
    PRISMA_QUERY_ENGINE_BINARY=/prisma-engines/query-engine \
    PRISMA_MIGRATION_ENGINE_BINARY=/prisma-engines/migration-engine \
    PRISMA_INTROSPECTION_ENGINE_BINARY=/prisma-engines/introspection-engine \
    PRISMA_FMT_BINARY=/prisma-engines/prisma-fmt
WORKDIR /app

# Copy all files (including source :/)
COPY --from=builder /app .

# Copy Prisma engines
COPY --from=prisma ["/app/target/release/query-engine", "/app/target/release/migration-engine", "/app/target/release/introspection-engine", "/app/target/release/prisma-fmt", "/prisma-engines/"]

# Prisma engines require openssl and possibly protoc
RUN apk add --no-cache openssl protoc

# Run
CMD ["node", "dist/index.js"]