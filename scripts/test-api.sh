#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"

echo -e "${BLUE}🧪 Testing Authentication Microservice${NC}"
echo "======================================="

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}⚠️  jq is not installed. Install it for better output formatting.${NC}"
    echo "   Mac: brew install jq"
    echo "   Linux: sudo apt-get install jq"
    echo ""
fi

# 1. Health Check
echo -e "\n${GREEN}1️⃣ Health Check${NC}"
echo "GET $API_URL/health"
curl -s $API_URL/health | jq 2>/dev/null || curl -s $API_URL/health
sleep 1

# 2. Register User
echo -e "\n${GREEN}2️⃣ Registering New User${NC}"
echo "POST $API_URL/auth/register"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }')
echo $REGISTER_RESPONSE | jq 2>/dev/null || echo $REGISTER_RESPONSE
sleep 1

# 3. Try to register same user again (should fail)
echo -e "\n${GREEN}3️⃣ Testing Duplicate Registration (should fail)${NC}"
echo "POST $API_URL/auth/register"
curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234",
    "firstName": "Test",
    "lastName": "User"
  }' | jq 2>/dev/null || curl -s -X POST $API_URL/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test@1234"}'
sleep 1

# 4. Login
echo -e "\n${GREEN}4️⃣ Logging In${NC}"
echo "POST $API_URL/auth/login"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test@1234"
  }')

if command -v jq &> /dev/null; then
    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
    REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.refreshToken')
    echo $LOGIN_RESPONSE | jq
else
    ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)
    echo $LOGIN_RESPONSE
fi
sleep 1

# 5. Get Current User Profile
echo -e "\n${GREEN}5️⃣ Getting Current User Profile${NC}"
echo "GET $API_URL/auth/me"
curl -s $API_URL/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq 2>/dev/null || curl -s $API_URL/auth/me -H "Authorization: Bearer $ACCESS_TOKEN"
sleep 1

# 6. Update Profile
echo -e "\n${GREEN}6️⃣ Updating User Profile${NC}"
echo "PATCH $API_URL/user/profile"
curl -s -X PATCH $API_URL/user/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }' | jq 2>/dev/null || curl -s -X PATCH $API_URL/user/profile -H "Authorization: Bearer $ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"firstName":"Updated","lastName":"Name"}'
sleep 1

# 7. Get Active Sessions
echo -e "\n${GREEN}7️⃣ Getting Active Sessions${NC}"
echo "GET $API_URL/user/sessions"
curl -s $API_URL/user/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq 2>/dev/null || curl -s $API_URL/user/sessions -H "Authorization: Bearer $ACCESS_TOKEN"
sleep 1

# 8. Test Token Refresh
echo -e "\n${GREEN}8️⃣ Testing Token Refresh${NC}"
echo "POST $API_URL/auth/refresh"
REFRESH_RESPONSE=$(curl -s -X POST $API_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")
echo $REFRESH_RESPONSE | jq 2>/dev/null || echo $REFRESH_RESPONSE

if command -v jq &> /dev/null; then
    NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')
else
    NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi
sleep 1

# 9. Test with new access token
echo -e "\n${GREEN}9️⃣ Testing New Access Token${NC}"
echo "GET $API_URL/auth/me"
curl -s $API_URL/auth/me \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq 2>/dev/null || curl -s $API_URL/auth/me -H "Authorization: Bearer $NEW_ACCESS_TOKEN"
sleep 1

# 10. Logout
echo -e "\n${GREEN}🔟 Logging Out${NC}"
echo "POST $API_URL/auth/logout"
curl -s -X POST $API_URL/auth/logout \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }" | jq 2>/dev/null || curl -s -X POST $API_URL/auth/logout -H "Authorization: Bearer $NEW_ACCESS_TOKEN" -H "Content-Type: application/json" -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"

echo -e "\n${BLUE}=======================================${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. Check Swagger docs: http://localhost:3000/api/v1/docs"
echo "2. Review logs: docker-compose logs -f auth_service"
echo "3. Try OAuth flows: http://localhost:3000/api/v1/auth/google"

