# --- Base Stage (Shared setup) ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- Operator Stage ---
FROM base AS mysql-operator
COPY / .
EXPOSE 3000
CMD ["npm", "run", "mysql-operator"]

FROM flyway/flyway:latest AS mysql-migrations

# Copying migration SQL files into the Flyway default directory
COPY migrations/flyway/migrations /flyway/sql

# Default command runs migrationsA
ENTRYPOINT ["flyway"]
CMD ["migrate"]
