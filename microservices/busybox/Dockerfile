# --- Base Stage (Shared Environment) ---
FROM node:20-alpine AS base

WORKDIR /app

# Copy utility files first if required across stages
COPY utility/ ./utility/


# --- Target Stage: Busybox Service ---
FROM base AS busybox

WORKDIR /app/busybox

# Copy dependency manifests first to leverage Docker build cache
COPY busybox/package*.json ./

# Install dependencies (cached unless package.json changes)
RUN npm install

# Copy remaining application source code
COPY busybox/ ./
EXPOSE 3000

# Set default execution command
CMD ["npm", "run", "start"]