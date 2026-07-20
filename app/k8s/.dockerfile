FROM node:20-alpine AS mysql_operator
WORKDIR /app

# Copy package files first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code into the container
COPY mysql ./app

# Expose gRPC port
EXPOSE 3000

# Set environment variables
ENV K8S_NAMESPACE=social-networks

# Start the
CMD ["node", "--import=extensionless/register", "index.js"]
