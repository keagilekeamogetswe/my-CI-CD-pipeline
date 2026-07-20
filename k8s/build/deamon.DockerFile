# # Build 1: Build the gRPC server
# FROM node:20-alpine AS grpc_server

# WORKDIR /app

# # Copy package files first for efficient caching
# COPY ../../package*.json ./

# # Install dependencies
# RUN npm ci --only=production

# # Copy your gRPC source code into the container
# COPY ../deamon ./app

# # Expose gRPC port
# EXPOSE 50051

# # Set environment variables
# ENV NODE_ENV=production

# # Start the gRPC server
# CMD ["node", "--import=extensionless/register", "app/deamon/grpc.js"]



# Build 2: Build the scheduler consumer
FROM node:20-alpine AS job_processor
WORKDIR /app

# Copy package files first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy your gRPC source code into the container
COPY app/deamon ./deamon
COPY app/utility/autoload.js utility/autoload.js

# Expose gRPC port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the
CMD ["node", "--import=extensionless/register", "deamon/worker/healthcheck/job.worker.health.server.js"]

# Install dependencies and set up the scheduler consumer here...

# # Build 3: Build the letter processor
# FROM python:3.11-slim AS letter_processor
# WORKDIR /app
# # Install dependencies and set up the letter processor here...

# # Stage 4: Build the job processor
# FROM python:3.11-slim AS job_processor
# WORKDIR /app
# # Install dependencies and set up the job processor here...
