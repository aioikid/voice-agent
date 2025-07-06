# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy all source files including index.html at root
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
COPY .env.example .env.example

# Copy built frontend from previous stage to the correct directory "dist"
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

# HEALTHCHECK is removed
# CMD ["python", "agent.py", "start"] is changed to "agent.py"
CMD ["python", "agent.py"]