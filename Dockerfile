# Set-up build image
FROM node:current-alpine AS builder
ENV NODE_ENV=development
WORKDIR /app

# Copy all files to working directory
COPY . .

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Compile Typescript
RUN npm run compile


# Set-up running image
FROM node:current-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy package.json and lockfile
COPY ["pnpm-lock.yaml", "package.json", "./"]

# Install dependencies
RUN npx pnpm install

# Copy build files
COPY --from=builder /app/dist ./dist

# Run
CMD ["npm", "start"]