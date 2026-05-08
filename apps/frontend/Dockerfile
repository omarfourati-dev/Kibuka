# Multi-stage build for frontend React 18 + Vite SPA
# Stage 1: Builder
FROM node:22-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy shared packages (dependencies for frontend)
COPY packages/ ./packages/

# Copy frontend app package.json
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies with frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy frontend source code
COPY apps/frontend/ ./apps/frontend/

# Build frontend
RUN pnpm --filter @omarsapp/frontend build

# Stage 2: Production (nginx)
FROM nginx:1.27-alpine

# Copy built frontend from builder
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
