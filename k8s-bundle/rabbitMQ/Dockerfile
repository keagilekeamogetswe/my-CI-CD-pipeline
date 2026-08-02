# --- Stage 1: Base RabbitMQ with Management UI ---
FROM rabbitmq:3.13-management AS base

# --- Stage 2: Install delayed message exchange plugin ---
FROM base AS plugin

# Download the plugin
ADD https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez \
    /opt/rabbitmq/plugins/

# Fix permissions and ownership
RUN chmod 644 /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-3.13.0.ez && \
    chown rabbitmq:rabbitmq /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-3.13.0.ez

# Enable the plugin while the image is being built
RUN rabbitmq-plugins enable --offline rabbitmq_delayed_message_exchange

# Debug (optional - remove once working)
RUN ls -l /opt/rabbitmq/plugins && \
    cat /etc/rabbitmq/enabled_plugins

# --- Stage 3: Runtime image ---
FROM plugin AS deamon-rabbit-mq

EXPOSE 5672 15672