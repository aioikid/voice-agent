# Frontend build stage
FROM node:18-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY src/ ./src/

RUN npm install
RUN npm run build

# Python backend stage
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py .
COPY server.py .
COPY .env.example .env.example

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./public

# Install additional Python packages for the server
RUN pip install fastapi uvicorn python-multipart

EXPOSE 8000 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "server.py"]