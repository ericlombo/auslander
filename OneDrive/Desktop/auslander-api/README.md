# Auslander Technology — Multi-Tenant SaaS Backend API

A production-ready NestJS backend implementing strict multi-tenant data isolation, JWT authentication, and RESTful API design.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | NestJS 10 + TypeScript |
| Database | PostgreSQL 16 + TypeORM |
| Auth | JWT (passport-jwt) + bcryptjs |
| Docs | Swagger / OpenAPI |
| Containers | Docker + Docker Compose |

---

## Architecture

```
src/
├── auth/                   # JWT auth, registration, login
│   ├── dto/                # RegisterDto, LoginDto
│   ├── strategies/         # JwtStrategy (validates token + user)
│   ├── auth.service.ts
│   └── auth.module.ts
├── tenants/                # Tenant CRUD
│   ├── dto/
│   ├── tenant.entity.ts
│   ├── tenants.service.ts
│   └── tenants.module.ts
├── users/                  # User management
│   ├── user.entity.ts
│   ├── users.service.ts
│   └── users.module.ts
├── projects/               # Projects (tenant-scoped)
│   ├── dto/
│   ├── project.entity.ts
│   ├── projects.service.ts
│   └── projects.module.ts
├── common/
│   ├── guards/             # JwtAuthGuard
│   ├── decorators/         # @CurrentUser()
│   └── filters/            # Global exception filter
├── database/
│   ├── data-source.ts      # TypeORM CLI datasource
│   └── migrations/         # SQL migrations
└── app.module.ts
```

### Tenant Isolation Strategy

The key security invariant is: **`tenantId` is always read from the JWT token — never from user input**.

1. On login/register, user provides `tenantId` (which tenant they belong to)
2. Server verifies the tenant exists and the user belongs to it
3. The verified `tenantId` is embedded in the signed JWT
4. On every protected request, the `JwtStrategy` validates the token and attaches the full `User` object to the request
5. The `@CurrentUser()` decorator extracts the user; controllers pass `user.tenantId` directly to services
6. Database queries always `WHERE tenant_id = :tenantId` — making cross-tenant data access impossible

---

## Quick Start



### Local Development

#### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally

#### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials and a strong JWT_SECRET

# 3. Create the database
psql -U postgres -c "CREATE DATABASE auslander_db;"

# 4. Run migrations (or let synchronize=true handle it in dev)
npm run migration:run

# 5. Start development server
npm run start:dev
```

---

## API Reference

### Authentication

#### `POST /auth/register`
Register a user under an existing tenant.

**Body:**
```json
{
  "email": "rick@eg.com",
  "password": "StrongPassword123!",
  "tenantId": "uuid-of-existing-tenant"
}
```

**Response `201`:**
```json
{
  "accessToken": "eyJhbGc...",
  "user": { "id": "...", "email": "rick@eg.com", "tenantId": "..." }
}
```

---

#### `POST /auth/login`
Login and receive a JWT.

**Body:**
```json
{
  "email": "rick@eg.com",
  "password": "StrongPassword123!",
  "tenantId": "uuid-of-tenant"
}
```

---

### Tenants

#### `POST /tenants`
Create a new tenant/organization.

**Body:**
```json
{ "name": "Acme Corp" }
```

---

#### `GET /tenants/:id` 
Get tenant by ID. Requires JWT.

---

### Projects

All project endpoints require a valid JWT (`Authorization: Bearer <token>`).

#### `POST /projects` 
Create a project. Automatically scoped to the authenticated user's tenant.

**Body:**
```json
{ "name": "My Project" }
```

#### `GET /projects` 
List all projects for the current user's tenant only.

---

## Typical Usage Flow

```bash
# 1. Create a tenant
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp"}'
# Save the returned tenant id

# 2. Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"rick@acme.com","password":"Password123!","tenantId":"<tenant-id>"}'
# Save the returned accessToken

# 3. Create a project
curl -X POST http://localhost:3000/projects \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Website Redesign"}'

# 4. List projects (only sees Acme Corp's projects)
curl http://localhost:3000/projects \
  -H "Authorization: Bearer <accessToken>"
```

---

## Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:cov
```

Tests cover:
- `AuthService` — registration conflicts, login validation, wrong credentials
- `ProjectsService` — tenant isolation (Tenant A cannot see Tenant B's data)

---

## Database Schema

```sql
tenants
  id         UUID PK
  name       VARCHAR UNIQUE
  created_at TIMESTAMP

users
  id         UUID PK
  email      VARCHAR
  password   VARCHAR (bcrypt hash, cost=12)
  tenant_id  UUID FK → tenants.id CASCADE
  created_at TIMESTAMP
  UNIQUE(email, tenant_id)

projects
  id         UUID PK
  name       VARCHAR
  tenant_id  UUID FK → tenants.id CASCADE
  created_at TIMESTAMP
  INDEX(tenant_id)
```

> Note: `email` is unique **per tenant**, not globally. The same email can register under different organizations.

---

## Security Notes

- Passwords hashed with **bcryptjs** (cost factor 12)
- JWT signed with `HS256`; secret must be a long random string in production
- `tenantId` in JWT payload is re-validated against the database on every request
- All inputs validated with `class-validator` + `ValidationPipe(whitelist: true)`
- SQL injection prevented by TypeORM parameterized queries
- Sensitive fields (`password`) excluded from serialization via `@Exclude()`

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | HTTP port | `3000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | DB user | `postgres` |
| `DB_PASSWORD` | DB password | `postgres` |
| `DB_DATABASE` | Database name | `auslander_db` |
| `JWT_SECRET` | **Required in prod** — long random string | — |
| `JWT_EXPIRES_IN` | Token TTL | `7d` |
