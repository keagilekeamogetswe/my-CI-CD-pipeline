#!/usr/bin/env bash

set -e

WEB_SERVER_PORT="${PORT:-3002}"

echo "Starting Express webserver and backend in the background..."
npm run frontend-test-services &

echo "Waiting for webserver to respond on port ${WEB_SERVER_PORT}..."
until nc -z localhost "${WEB_SERVER_PORT}" 2>/dev/null || curl -s "http://localhost:${WEB_SERVER_PORT}" >/dev/null; do
  sleep 1
done

echo "Webserver is up on port ${WEB_SERVER_PORT}!"
echo "Static frontend assets are being served by swift-webserver."
exit 0