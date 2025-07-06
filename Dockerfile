# Frontend build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js ./
COPY tailwind.config.js ./
COPY eslint.config.js ./
COPY src/ ./src/
RUN npm run build

# Python backend stage
FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY agent.py .
COPY server.py .
# Copy built frontend from previous stage to the "public" directory
COPY --from=frontend-builder /app/dist ./public

EXPOSE 8000

# CMDでserver.pyを起動する
CMD ["python", "server.py"]