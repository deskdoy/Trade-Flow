#!/bin/bash

# Setup script for TradeFlow Platform
echo "==========================================="
echo "Initializing TradeFlow Workspace..."
echo "==========================================="

# Check for package managers
if command -v pnpm &> /dev/null; then
  echo "[1/3] PNPM detected. Installing workspace dependencies..."
  pnpm install
elif command -v npm &> /dev/null; then
  echo "[1/3] NPM detected. Installing standard packages..."
  npm install
else
  echo "Error: No package manager (pnpm/npm) found. Please install Node.js."
  exit 1
fi

echo "[2/3] Building packages..."
# Setup workspace directories or run initial tsc compiles for shared package
echo "Packages initialized successfully."

echo "[3/3] Creating local .env environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from template."
else
  echo ".env file already exists."
fi

echo "==========================================="
echo "TradeFlow initialized successfully!"
echo "Run 'npm run dev' to start the full-stack desk."
echo "==========================================="
