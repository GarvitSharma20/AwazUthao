# Stage 1: Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install ALL dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Build both the frontend and compile the Express backend
RUN npm run build

# Stage 2: Production runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy dependency files and install production-only dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled files (dist folder containing frontend assets and server.cjs)
COPY --from=builder /app/dist ./dist

# Expose port 8080 (standard for Cloud Run)
EXPOSE 8080

# Start the full-stack server
CMD ["node", "dist/server.cjs"]
