# --- Base Stage (Shared setup) ---
FROM node:20-alpine AS base

# Standardize workdir name
WORKDIR /microservice

# Copy local dependencies/utilities (Must be inside build context directory)
COPY utility/ ./utility/
COPY proto/ ./proto/
ENV HEALTH_PORT=3000

# --- Deamon Stage ---
FROM base AS deamon
WORKDIR /microservice/deamon
# Copy the rest of the application source code into /daemon
COPY deamon/ ./
# Now npm install sees package.json in /daemon
RUN npm install
#==============================
# We can run npm run predefined in k8s per deployment type
#+++++++++++++++++++++++++++++
# FROM deamon-base AS deamon-schedule-consumer
# EXPOSE 3000
# CMD ["npm", "run", "schedule-consumer"]

# FROM deamon-base AS deamon-job-processor
# EXPOSE 3000
# CMD ["npm", "run", "job-processor"]
# FROM deamon-base AS deamon-deadletter-consumer
# EXPOSE 3000
# CMD ["npm", "run", "deadletter-consumer"]

# FROM deamon-base AS deamon-grpc
# EXPOSE 3000
# CMD ["npm", "run", "deadletter"]