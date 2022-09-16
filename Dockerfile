# Set-up build image
FROM node:18-slim AS builder
ENV NODE_ENV=development

WORKDIR /app

# Copy package.json, lockfile and .npmrc
COPY ["pnpm-lock.yaml", "package.json", ".npmrc", "./"]

# Install dependencies
RUN apt-get update && \
    apt-get -y install build-essential python3 && \
    rm -rf /var/cache/apt/archives /var/lib/apt/lists/* && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN pnpm tsc && \
    pnpm prisma generate && \
    pnpm prune --prod

# Set-up running image
FROM node:18-slim
ARG commit_hash
ENV NODE_ENV=production \
    COMMIT_HASH=$commit_hash
WORKDIR /app

# Install openssl
RUN apt-get update && \
    apt-get -y openssl && \
    rm -rf /var/cache/apt/archives /var/lib/apt/lists/*


# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["node", "dist/index.js"]
