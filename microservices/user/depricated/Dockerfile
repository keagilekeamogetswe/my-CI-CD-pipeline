# Use official Node.js image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of your app
COPY app/user ./user

WORKDIR /app/user

# Expose the app port
EXPOSE 3001

# Start the app
CMD ["node", "server.js"]
