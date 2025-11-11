#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Authentication Microservice Setup${NC}"
echo "======================================"
echo ""

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/${NC}"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker: $DOCKER_VERSION${NC}"
else
    echo -e "${YELLOW}⚠️  Docker not found. You'll need to install PostgreSQL and Redis manually.${NC}"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✅ Docker Compose: $DOCKER_COMPOSE_VERSION${NC}"
fi

echo ""

# Ask setup method
echo -e "${BLUE}Choose setup method:${NC}"
echo "1) Docker (Recommended - Everything in containers)"
echo "2) Local (Manual PostgreSQL and Redis setup required)"
read -p "Enter choice (1 or 2): " SETUP_METHOD

if [ "$SETUP_METHOD" = "1" ]; then
    echo -e "\n${GREEN}Setting up with Docker...${NC}"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        
        # Generate secrets
        echo -e "${BLUE}Generating secure secrets...${NC}"
        if command -v openssl &> /dev/null; then
            JWT_SECRET=$(openssl rand -base64 32)
            JWT_REFRESH_SECRET=$(openssl rand -base64 32)
            COOKIE_SECRET=$(openssl rand -base64 32)
            SESSION_SECRET=$(openssl rand -base64 32)
            
            # Update .env with generated secrets
            sed -i.bak "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/" .env
            sed -i.bak "s/your-super-secret-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/" .env
            sed -i.bak "s/your-cookie-secret-change-this-in-production/$COOKIE_SECRET/" .env
            sed -i.bak "s/your-session-secret-change-this-in-production/$SESSION_SECRET/" .env
            rm .env.bak
            
            echo -e "${GREEN}✅ Secrets generated and saved to .env${NC}"
        else
            echo -e "${YELLOW}⚠️  OpenSSL not found. Please update JWT secrets in .env manually.${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
    
    # Install dependencies
    echo -e "\n${BLUE}Installing dependencies...${NC}"
    npm install
    
    # Start Docker containers
    echo -e "\n${BLUE}Starting Docker containers...${NC}"
    docker-compose up -d
    
    # Wait for services to be ready
    echo -e "\n${BLUE}Waiting for services to start...${NC}"
    sleep 5
    
    # Check health
    echo -e "\n${BLUE}Checking service health...${NC}"
    for i in {1..10}; do
        if curl -s http://localhost:3000/api/v1/health > /dev/null; then
            echo -e "${GREEN}✅ Service is running!${NC}"
            break
        fi
        echo "Attempt $i/10..."
        sleep 3
    done
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Service URLs:${NC}"
    echo "  API: http://localhost:3000/api/v1"
    echo "  Docs: http://localhost:3000/api/v1/docs"
    echo "  Health: http://localhost:3000/api/v1/health"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo "  View logs: docker-compose logs -f auth_service"
    echo "  Stop: docker-compose stop"
    echo "  Restart: docker-compose restart"
    echo "  Remove: docker-compose down"
    echo ""
    echo -e "${BLUE}Test the API:${NC}"
    echo "  chmod +x scripts/test-api.sh && ./scripts/test-api.sh"
    
elif [ "$SETUP_METHOD" = "2" ]; then
    echo -e "\n${GREEN}Setting up for local development...${NC}"
    
    # Check if .env exists
    if [ ! -f .env ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your local database credentials${NC}"
    fi
    
    # Install dependencies
    echo -e "\n${BLUE}Installing dependencies...${NC}"
    npm install
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Dependencies installed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${RED}⚠️  Before starting:${NC}"
    echo "1. Ensure PostgreSQL is running on port 5432"
    echo "2. Create database: CREATE DATABASE auth_microservice;"
    echo "3. (Optional) Start Redis on port 6379"
    echo "4. Update .env with your credentials"
    echo ""
    echo -e "${BLUE}Start the service:${NC}"
    echo "  npm run start:dev"
    
else
    echo -e "${RED}Invalid choice${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  README.md - Complete documentation"
echo "  SETUP_GUIDE.md - Detailed setup guide"
echo "  API_EXAMPLES.md - API usage examples"
echo "  ARCHITECTURE.md - System architecture"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"

