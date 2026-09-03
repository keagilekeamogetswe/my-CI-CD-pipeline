#!/usr/bin/env bash

set -e

echo "Starting Express backend in the background..."
npm run frontend-test-services &

echo "Waiting for backend to respond on port 3002..."
until nc -z localhost 3002 2>/dev/null || curl -s http://localhost:3002 >/dev/null; do
  sleep 1
done

echo "Backend is up on port 3002!"
echo "Starting Next.js frontend in the background..."

cd frontend/swift/website
npm run dev &

echo "All services launched successfully in the background!"
exit 0