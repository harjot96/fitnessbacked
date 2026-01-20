# Quick Start Guide

## Important: Disk Space Issue

Your system is low on disk space (100% used). You need to free up space before running `npm install`.

## Steps to Run the API

### 1. Free Up Disk Space
- Delete unused files
- Clear npm cache: `npm cache clean --force`
- Remove old node_modules if any

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb health_fitness

# Or using psql:
psql -U postgres
CREATE DATABASE health_fitness;
\q
```

### 3. Configure Backend

```bash
cd backend

# Create .env file
cat > .env << EOF
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/health_fitness?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:19006
EOF

# Install dependencies (after freeing space)
npm install

# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Start server
npm run dev
```

### 4. Test Backend

Open browser: `http://localhost:4000/graphql`

Try this mutation:
```graphql
mutation {
  register(email: "test@test.com", password: "test123", displayName: "Test") {
    token
    user {
      id
      email
    }
  }
}
```

### 5. Configure Frontend

```bash
# From project root
echo "EXPO_PUBLIC_API_URL=http://localhost:4000/graphql" > .env

# Install frontend dependencies
npm install

# Start Expo
npm start
```

## Verify API is Working

1. Backend health check: `curl http://localhost:4000/health`
2. GraphQL Playground: Visit `http://localhost:4000/graphql`
3. Test registration mutation (see above)

