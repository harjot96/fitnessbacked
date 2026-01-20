# Health & Fitness Backend API

Node.js backend with Express, GraphQL (Apollo Server), and PostgreSQL.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   - Create a PostgreSQL database
   - Update `DATABASE_URL` in `.env` file

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run Prisma migrations:**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

5. **Start the server:**
   ```bash
   npm run dev
   ```

The GraphQL API will be available at `http://localhost:4000/graphql`

## Testing the API

You can test the API using GraphQL Playground (available in development mode) or any GraphQL client.

### Example: Register a user

```graphql
mutation {
  register(email: "test@example.com", password: "password123", displayName: "Test User") {
    token
    refreshToken
    user {
      id
      email
      displayName
    }
  }
}
```

### Example: Login

```graphql
mutation {
  login(email: "test@example.com", password: "password123") {
    token
    refreshToken
    user {
      id
      email
      displayName
    }
  }
}
```

### Example: Get current user (requires auth token)

Add to headers:
```
Authorization: Bearer YOUR_TOKEN_HERE
```

```graphql
query {
  me {
    id
    email
    displayName
    profile {
      age
      weight
      height
    }
  }
}
```

## API Endpoints

- **GraphQL:** `http://localhost:4000/graphql`
- **Health Check:** `http://localhost:4000/health`

