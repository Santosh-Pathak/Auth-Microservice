# 🏗️ Architecture Documentation

## Overview

This Authentication Microservice follows **Domain-Driven Design (DDD)** and **Clean Architecture** principles, ensuring maintainability, testability, and scalability.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Application Layers](#application-layers)
3. [Design Patterns](#design-patterns)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Scalability Considerations](#scalability-considerations)

## System Architecture

### High-Level Architecture

```
┌─────────────────┐
│   Client Apps   │
│  (Web, Mobile)  │
└────────┬────────┘
         │ HTTPS/REST
         ▼
┌─────────────────┐
│  Load Balancer  │
│   (Optional)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   Auth Microservice (NestJS)        │
│  ┌──────────────────────────────┐   │
│  │   Controllers (HTTP Layer)   │   │
│  └─────────────┬────────────────┘   │
│                │                     │
│  ┌─────────────▼────────────────┐   │
│  │   Services (Business Logic)  │   │
│  └─────────────┬────────────────┘   │
│                │                     │
│  ┌─────────────▼────────────────┐   │
│  │   Repositories (Data Layer)  │   │
│  └─────────────┬────────────────┘   │
└────────────────┼────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼─────┐   ┌───────▼─────┐
│  PostgreSQL │   │    Redis    │
│  (Database) │   │   (Cache)   │
└─────────────┘   └─────────────┘
```

### Component Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Auth Microservice                      │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Presentation Layer                     │  │
│  │  - Controllers (REST API endpoints)                │  │
│  │  - Guards (Authentication/Authorization)           │  │
│  │  - Decorators (Custom metadata)                    │  │
│  │  - DTOs (Request/Response validation)              │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│  ┌────────────────▼───────────────────────────────────┐  │
│  │              Business Logic Layer                   │  │
│  │  - AuthService (Core authentication logic)         │  │
│  │  - TokenService (JWT & Refresh tokens)             │  │
│  │  - SessionService (Session management)             │  │
│  │  - UserService (User operations)                   │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│  ┌────────────────▼───────────────────────────────────┐  │
│  │              Data Access Layer                      │  │
│  │  - TypeORM Repositories                            │  │
│  │  - Entity Models                                   │  │
│  │  - Database Migrations                             │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
│  ┌────────────────▼───────────────────────────────────┐  │
│  │           Infrastructure Layer                      │  │
│  │  - Database Connection                             │  │
│  │  - Redis Cache                                     │  │
│  │  - Logger Service                                  │  │
│  │  - Config Management                               │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Application Layers

### 1. Presentation Layer (Controllers)

**Responsibility**: Handle HTTP requests/responses, route to business logic

```typescript
AuthController
├── POST /register      → Register new user
├── POST /login         → Authenticate user
├── POST /refresh       → Refresh access token
├── POST /logout        → Terminate session
├── GET  /google        → OAuth flow
└── GET  /me            → Get current user
```

**Key Components**:
- Request validation (DTOs)
- Route guards (JWT, Local, OAuth)
- Response serialization
- Error handling

### 2. Business Logic Layer (Services)

**AuthService**
- User registration
- Login validation
- OAuth user handling
- Email verification
- Password reset

**TokenService**
- JWT generation & validation
- Refresh token management
- Token rotation & revocation
- Token cleanup

**SessionService**
- Session creation
- Session tracking
- Device information parsing
- Session revocation

### 3. Data Access Layer (Repositories)

**Entities**:
- `User` - User accounts and profiles
- `RefreshToken` - Refresh token records
- `Session` - Active user sessions

**Relationships**:
```
User (1) ──── (N) RefreshToken
User (1) ──── (N) Session
```

### 4. Infrastructure Layer

- Database configuration
- Caching setup
- Logging system
- Environment configuration

## Design Patterns

### 1. Dependency Injection

NestJS provides built-in DI container:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private userRepository: Repository<User>,
    private tokenService: TokenService,
    private sessionService: SessionService,
  ) {}
}
```

**Benefits**:
- Loose coupling
- Easy testing (mock dependencies)
- Better maintainability

### 2. Strategy Pattern (Passport.js)

Multiple authentication strategies:

```typescript
- LocalStrategy (email/password)
- JwtStrategy (JWT tokens)
- GoogleStrategy (Google OAuth)
- GithubStrategy (GitHub OAuth)
```

### 3. Guard Pattern

Protect routes with reusable guards:

```typescript
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  // Only authenticated users
}
```

### 4. Decorator Pattern

Custom decorators for clean code:

```typescript
@CurrentUser() - Extract user from request
@Public() - Mark routes as public
```

### 5. Repository Pattern

Abstract data access:

```typescript
@InjectRepository(User)
private userRepository: Repository<User>
```

## Data Flow

### Registration Flow

```
Client Request
    │
    ▼
[POST /auth/register]
    │
    ▼
[Validation] ← DTO validation
    │
    ▼
[AuthService.register()]
    │
    ├──→ Check existing user
    ├──→ Hash password (bcrypt)
    ├──→ Generate verification token
    ├──→ Save user to database
    └──→ Send verification email (TODO)
    │
    ▼
[Response: Success message]
```

### Login Flow

```
Client Request (email + password)
    │
    ▼
[POST /auth/login]
    │
    ▼
[LocalAuthGuard]
    │
    ▼
[LocalStrategy.validate()]
    │
    ├──→ Find user by email
    ├──→ Compare password (bcrypt)
    └──→ Return user or throw error
    │
    ▼
[AuthService.login()]
    │
    ├──→ Generate access token (JWT)
    ├──→ Generate refresh token
    ├──→ Create session record
    └──→ Update last login time
    │
    ▼
[Response: Tokens + User data]
```

### OAuth Flow (Google/GitHub)

```
Client
    │
    ▼
[GET /auth/google] ← Redirect to Google
    │
    ▼
Google Login Page
    │
    ▼
[GET /auth/google/callback] ← Google redirects back
    │
    ▼
[GoogleStrategy.validate()]
    │
    ├──→ Extract profile data
    └──→ Find or create user
    │
    ▼
[AuthService.validateOAuthUser()]
    │
    ├──→ Check existing user (email/providerId)
    ├──→ Update or create user
    └──→ Mark email as verified
    │
    ▼
[Generate tokens]
    │
    ▼
[Redirect to frontend with tokens]
```

### Protected Route Flow

```
Client Request + JWT Token
    │
    ▼
[Protected Endpoint]
    │
    ▼
[JwtAuthGuard]
    │
    ▼
[JwtStrategy.validate()]
    │
    ├──→ Extract token from header
    ├──→ Verify signature
    ├──→ Check expiration
    └──→ Load user from database
    │
    ▼
[Execute controller method]
    │
    ▼
[Response with data]
```

## Security Architecture

### Token Security

**Access Tokens (JWT)**
- Short-lived (15 minutes default)
- Stored in memory (client)
- Contains minimal user data
- Signed with secret key

**Refresh Tokens**
- Long-lived (7 days default)
- Stored in database
- Rotated on use
- Can be revoked
- Tracked with device info

### Password Security

```
Plain Password
    │
    ▼
[Bcrypt Hash] ← 10 rounds (configurable)
    │
    ▼
Database Storage
```

### Request Security

1. **Rate Limiting**
   - 10 requests/minute per IP
   - Configurable via environment

2. **CORS**
   - Whitelist frontend domain
   - Credentials support enabled

3. **Helmet.js**
   - Security headers
   - XSS protection
   - Content Security Policy

4. **Input Validation**
   - DTO validation with class-validator
   - Whitelist unknown properties
   - Transform input types

### Session Security

- Unique session IDs (UUID)
- Device fingerprinting
- IP address tracking
- Activity timestamps
- Manual revocation support

## Scalability Considerations

### Horizontal Scaling

```
Load Balancer
    │
    ├──→ Auth Service Instance 1
    ├──→ Auth Service Instance 2
    └──→ Auth Service Instance 3
         │
         └──→ Shared Database (PostgreSQL)
         └──→ Shared Cache (Redis)
```

**Stateless Design**:
- JWT tokens (no server-side session storage)
- Refresh tokens stored in database (accessible by all instances)
- Session data in database (accessible by all instances)

### Vertical Scaling

- Increase CPU/RAM for single instance
- Optimize database queries
- Add database indexes
- Implement caching

### Database Optimization

**Indexes** (already implemented):
```sql
- users.email (unique)
- refresh_tokens.token (unique)
- refresh_tokens.userId
- sessions.sessionId (unique)
- sessions.userId
```

**Connection Pooling**:
- TypeORM handles connection pooling
- Configurable pool size

### Caching Strategy (Ready for Implementation)

```
Request → Check Redis Cache
              │
              ├─ Hit → Return cached data
              │
              └─ Miss → Query database
                        → Cache result
                        → Return data
```

**Cacheable Data**:
- User profiles (TTL: 5 minutes)
- Session data (TTL: 1 hour)
- Token blacklist (TTL: token expiry)

### Monitoring & Observability

**Health Checks**:
- `/health` - Overall service health
- `/health/ready` - Ready to accept traffic
- `/health/live` - Service is running

**Logging**:
- Structured JSON logs
- Daily rotation
- Error tracking
- User action audit trail

**Metrics** (Ready to add):
- Request rate
- Response time
- Error rate
- Active users
- Token generation rate

## Microservice Communication

### Future Integration Patterns

**1. API Gateway Pattern**
```
Client → API Gateway → Auth Service
                    → User Service
                    → Product Service
```

**2. Service Mesh**
```
Auth Service ←→ Service Mesh ←→ Other Services
    │              │
    └──────────────┴───→ Shared Infrastructure
```

**3. Event-Driven**
```
Auth Service → Message Queue → Other Services
               (User Registered Event)
               (User Logged In Event)
```

## Database Schema

```sql
-- Users table
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR UNIQUE,
  password: VARCHAR,
  firstName: VARCHAR,
  lastName: VARCHAR,
  avatar: VARCHAR,
  provider: ENUM,
  providerId: VARCHAR,
  isEmailVerified: BOOLEAN,
  emailVerificationToken: VARCHAR,
  emailVerificationExpires: TIMESTAMP,
  passwordResetToken: VARCHAR,
  passwordResetExpires: TIMESTAMP,
  isActive: BOOLEAN,
  lastLoginAt: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
)

-- Refresh tokens table
refresh_tokens (
  id: UUID PRIMARY KEY,
  token: VARCHAR UNIQUE,
  userId: UUID FOREIGN KEY → users.id,
  expiresAt: TIMESTAMP,
  isRevoked: BOOLEAN,
  revokedAt: TIMESTAMP,
  replacedByToken: VARCHAR,
  userAgent: VARCHAR,
  ipAddress: VARCHAR,
  createdAt: TIMESTAMP
)

-- Sessions table
sessions (
  id: UUID PRIMARY KEY,
  sessionId: VARCHAR UNIQUE,
  userId: UUID FOREIGN KEY → users.id,
  userAgent: VARCHAR,
  ipAddress: VARCHAR,
  device: VARCHAR,
  browser: VARCHAR,
  os: VARCHAR,
  expiresAt: TIMESTAMP,
  isActive: BOOLEAN,
  createdAt: TIMESTAMP,
  lastActivityAt: TIMESTAMP
)
```

## Testing Strategy

### Unit Tests
- Service logic
- Utility functions
- Guards and decorators

### Integration Tests
- Controller endpoints
- Database operations
- Authentication flows

### E2E Tests
- Complete user journeys
- OAuth flows
- Token refresh cycles

## Deployment Architecture

### Docker Container
```dockerfile
Multi-stage build:
1. Builder stage (compile TypeScript)
2. Production stage (minimal image)
```

### Kubernetes Deployment
```yaml
- Deployment (3 replicas)
- Service (ClusterIP)
- Ingress (HTTPS)
- ConfigMap (config)
- Secret (credentials)
- HPA (auto-scaling)
```

## Best Practices Implemented

✅ **Separation of Concerns** - Clear layer boundaries
✅ **Dependency Injection** - Loose coupling
✅ **DTO Validation** - Input sanitization
✅ **Error Handling** - Consistent error responses
✅ **Logging** - Structured logging
✅ **Documentation** - Swagger/OpenAPI
✅ **Security** - Multiple layers of protection
✅ **Scalability** - Stateless design
✅ **Testability** - Mockable dependencies
✅ **Maintainability** - Clean code, comments

---

This architecture provides a solid foundation for production use while remaining flexible for future enhancements and integrations with other microservices.

