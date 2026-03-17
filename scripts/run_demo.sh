#!/bin/bash
echo "--- Initializing Edge Risk PoC v1.0.0 ---"
docker compose down
docker compose up --build -d
echo "App is running at http://localhost:5173"