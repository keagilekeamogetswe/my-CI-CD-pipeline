FROM node:18-alpine

WORKDIR /app

# Copy root package.json
COPY package*.json ./

RUN npm install

# Copy only messages service code
COPY app/messages ./messages

WORKDIR /app/messages

EXPOSE 3000

CMD ["node", "server.js"]