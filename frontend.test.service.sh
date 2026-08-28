#!/usr/bin/env bash

set -e

echo "Starting Express backend in the background..."
npm run frontend-test-services &
BACKEND_PID=$!

cleanup() {
  echo -e "\nStopping backend process tree..."
  if [ -n "$BACKEND_PID" ]; then
    taskkill //F //T //PID $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Waiting for backend to respond on port 3002..."
until nc -z localhost 3002 2>/dev/null || curl -s http://localhost:3002 >/dev/null; do
  sleep 1
done

echo "Backend is up on port 3002!"
echo "Starting Next.js frontend..."

cd frontend/swift/website
npm run dev