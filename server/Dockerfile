FROM node:20-alpine

WORKDIR /app

# Copy package files (exclude lock to allow Linux-specific resolution, skips darwin-only fsevents)
COPY package.json ./
RUN npm install

# Copy source
COPY . .

# Build not needed - we run with tsx at runtime
# Expose port
EXPOSE 2050

# Run with tsx (TypeScript execution)
CMD ["npx", "tsx", "src/index.ts"]
