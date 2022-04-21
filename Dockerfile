# Set-up build image
FROM node:current-slim AS builder
ENV NODE_ENV=development
WORKDIR /app

# Copy package.json and lockfile
COPY ["pnpm-lock.yaml", "package.json", "./"]

# Install dependencies
RUN apt-get update && \
    apt-get install -y build-essential python3 && \
    rm -rf /var/lib/apt/lists/* && \
    npm install -g pnpm && \
    pnpm install

# Copy all files to working directory
COPY . .

# Compile Typescript and remove dev packages
RUN npm run compile && \
    pnpm prune --prod


# Set-up running image
FROM node:current-slim
ENV NODE_ENV=production
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y imagemagick && \
    rm -rf /var/lib/apt/lists/*

# Copy all files (including source :/)
COPY --from=builder /app .

# Run
CMD ["npm", "start"]