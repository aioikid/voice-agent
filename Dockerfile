# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy all necessary files for the build
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY eslint.config.js ./
COPY src/ ./src/

# Build the frontend
RUN npm run build

# Python backend stage
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python files
COPY agent.py .
COPY server.py .
COPY .env.example .env.example

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./public

EXPOSE 8000 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "server.py"]