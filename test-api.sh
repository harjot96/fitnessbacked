#!/bin/bash

# Test script for the REST API

API_URL="http://localhost:4000"

echo "Testing Health Check..."
curl -s $API_URL/health | jq .

echo -e "\n\nTesting REST API - Register User..."
curl -s -X POST $API_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "displayName": "Test User"
  }' | jq .

echo -e "\n\nTesting REST API - Login..."
TOKEN=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }' | jq -r '.data.token')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo "Token received: ${TOKEN:0:20}..."
  
  echo -e "\n\nTesting REST API - Get Current User..."
  curl -s -X GET $API_URL/api/auth/me \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n\nTesting REST API - Get Daily Health Data..."
  TODAY=$(date +%Y-%m-%d)
  curl -s -X GET $API_URL/api/health/daily/$TODAY \
    -H "Authorization: Bearer $TOKEN" | jq .
  
  echo -e "\n\nTesting REST API - Get Friends..."
  curl -s -X GET $API_URL/api/community/friends \
    -H "Authorization: Bearer $TOKEN" | jq .
else
  echo "Failed to get token. Make sure the user exists or register first."
fi

echo -e "\n\nAPI Tests Complete!"
