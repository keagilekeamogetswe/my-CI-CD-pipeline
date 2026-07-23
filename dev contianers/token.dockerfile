# --- Base Stage (Shared setup) ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Operator Stage ---
FROM base AS operator
COPY mysql/ ./mysql/
EXPOSE 8081
ENV K8S_NAMESPACE=social-networks
CMD ["npm", "run", "mysql-operator"]

# --- Token Stage ---
FROM base AS token
COPY test/ ./test/
EXPOSE 8081
ENV K8S_NAMESPACE=social-networks
CMD ["npm", "run", "token"]
