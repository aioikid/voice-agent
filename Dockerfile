FROM node:18-alpine AS frontend-builder

# Install dependencies for frontend
WORKDIR /app/frontend
COPY package*.json ./
RUN npm install

# Copy frontend source and build
COPY . .
RUN npm run build

# Python backend stage
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python agent
COPY agent.py .
COPY .env.example .env.example

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/frontend/dist ./public

# Install a simple HTTP server for serving frontend
RUN pip install fastapi uvicorn python-multipart

# Create a simple server to serve both frontend and handle backend
COPY server.py .

# Expose ports
EXPOSE 8000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start both services
CMD ["python", "server.py"]