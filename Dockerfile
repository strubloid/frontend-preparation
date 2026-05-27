# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy backend and frontend package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN cd backend && npm ci
RUN cd frontend && npm install

# Copy source code
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
COPY frontend/src ./frontend/src
COPY frontend/angular.json ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend/public ./frontend/public

# Build backend
RUN cd backend && npm run build

# Build frontend
RUN cd frontend && npm run build

# Runtime stage
FROM node:22-alpine

WORKDIR /app

# Copy backend runtime dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy built backend
COPY --from=builder /app/backend/dist ./backend/dist

# Copy built frontend to public directory
COPY --from=builder /app/frontend/dist/frontend/browser ./backend/dist/public

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start the app
CMD ["node", "backend/dist/server.js"]
