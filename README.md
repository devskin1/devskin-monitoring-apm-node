# @devskin/agent

DevSkin APM Agent for Node.js - Automatic instrumentation for application performance monitoring.

## Installation

```bash
npm install @devskin/agent
```

## Quick Start

### 1. Initialize the Agent

```javascript
const { init, startAgent } = require('@devskin/agent');

const agent = init({
  serverUrl: 'https://api-monitoring.devskin.com',
  apiKey: 'your-api-key-here',
  applicationId: 'your-application-id',  // 🔑 REQUIRED: Links traces to your application
  serviceName: 'my-api-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  sampleRate: 1.0,
});

startAgent();
```

### 2. With Express

```javascript
const express = require('express');
const { init, startAgent, expressMiddleware, expressErrorHandler } = require('@devskin/agent');

const agent = init({
  serverUrl: 'https://api-monitoring.devskin.com',
  apiKey: 'your-api-key',
  applicationId: 'your-application-id',  // 🔑 REQUIRED
  serviceName: 'my-express-app',
});

await startAgent();

const app = express();

// Add middleware BEFORE your routes
app.use(expressMiddleware(agent));

// Your routes
app.get('/api/users', async (req, res) => {
  // Automatically traced!
  const users = await getUsers();
  res.json(users);
});

// Add error handler AFTER your routes
app.use(expressErrorHandler(agent));

app.listen(3000);
```

### 3. Manual Span Creation

```javascript
const { SpanBuilder, SpanKind, getAgent } = require('@devskin/agent');

const agent = getAgent();

async function processOrder(orderId) {
  const span = new SpanBuilder(
    'processOrder',
    SpanKind.INTERNAL,
    agent.getConfig().serviceName,
    agent.getConfig().serviceVersion,
    agent.getConfig().environment,
    agent
  );

  span.setAttribute('order.id', orderId);

  try {
    // Your business logic
    const order = await fetchOrder(orderId);
    span.setAttribute('order.amount', order.amount);

    return order;
  } catch (error) {
    span.recordError(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | string | *required* | DevSkin backend URL |
| `apiKey` | string | *required* | API key for authentication |
| `applicationId` | string | *required* | 🔑 **Application ID** - Links traces to your application |
| `serviceName` | string | *required* | Name of your service |
| `serviceVersion` | string | undefined | Version of your service |
| `environment` | string | undefined | Environment (production, staging, etc) |
| `enabled` | boolean | true | Enable/disable agent |
| `sampleRate` | number | 1.0 | Sample rate (0.0 to 1.0) |
| `instrumentHttp` | boolean | true | Auto-instrument HTTP |
| `instrumentExpress` | boolean | true | Auto-instrument Express |
| `instrumentDatabase` | boolean | false | 🔥 **Auto-instrument MySQL/MySQL2/Prisma/Postgres/MongoDB** |
| `batchSize` | number | 100 | Batch size before flushing |
| `flushInterval` | number | 10000 | Flush interval in ms |
| `debug` | boolean | false | Enable debug logging |

## Features

- ✅ Automatic HTTP request/response tracing
- ✅ Express middleware for automatic route tracing
- ✅ **Database query instrumentation (MySQL, MySQL2, TypeORM, Prisma, Postgres, MongoDB)**
- ✅ Manual span creation
- ✅ Distributed tracing with trace ID propagation
- ✅ Error tracking and reporting
- ✅ Sampling support
- ✅ Async context propagation
- ✅ Service discovery

## Database Monitoring

Enable automatic database query instrumentation to track slow queries, errors, and performance:

### MySQL/MySQL2 (Including TypeORM)

```javascript
const { init, startAgent } = require('@devskin/agent');

// Initialize BEFORE requiring database modules
init({
  serverUrl: 'http://localhost:3060',
  apiKey: 'your-api-key',
  applicationId: 'your-app-id',
  serviceName: 'my-api',
  instrumentDatabase: true,  // 🔥 Enable database instrumentation
  debug: false
});

startAgent();

// Now require your database modules
const mysql = require('mysql2/promise');
const { DataSource } = require('typeorm');

// All queries will be automatically traced
const connection = await mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'mydb'
});

const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [123]);
// ✅ Query automatically captured with execution time, errors, row count
```

### With TypeORM

```javascript
const { init, startAgent } = require('@devskin/agent');

// IMPORTANT: Initialize agent BEFORE TypeORM
init({
  serverUrl: 'http://localhost:3060',
  apiKey: 'your-api-key',
  applicationId: 'your-app-id',
  serviceName: 'my-api',
  instrumentDatabase: true,
});

startAgent();

// Now initialize TypeORM
const { DataSource } = require('typeorm');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: 'root',
  password: 'password',
  database: 'mydb',
  entities: [User],
  synchronize: false,
});

await AppDataSource.initialize();

// All TypeORM queries are automatically traced
const users = await AppDataSource.getRepository(User).find();
// ✅ Captured: query text, execution time, rows affected, errors
```

### With Prisma

```javascript
const { init, startAgent } = require('@devskin/agent');

// IMPORTANT: Initialize agent BEFORE creating PrismaClient
init({
  serverUrl: 'http://localhost:3060',
  apiKey: 'your-api-key',
  applicationId: 'your-app-id',
  serviceName: 'my-api',
  instrumentDatabase: true,  // 🔥 Enable Prisma instrumentation
});

startAgent();

// Now create PrismaClient
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// All Prisma queries are automatically traced via middleware
const users = await prisma.user.findMany({
  where: { status: 'active' },
  include: { posts: true }
});
// ✅ Captured: operation name (findMany), model (User), args, execution time, errors
```

**Important**: The agent automatically adds middleware to ALL PrismaClient instances created after `init()`. You don't need to manually add `$use()` middleware.

### What Gets Tracked

Each database query span includes:
- **Query text**: Full SQL statement (truncated for security)
- **Query type**: SELECT, INSERT, UPDATE, DELETE, etc.
- **Database name**: Which database was queried
- **Execution time**: How long the query took (in ms)
- **Rows affected**: Number of rows returned/modified
- **Errors**: Stack trace if query failed
- **Connection info**: Host, port, user (password excluded)

### View Database Monitoring

After deploying your instrumented app, view query analytics at:
```
http://localhost:5173/apm/database
```

Features:
- 📊 Slowest queries with P95/P99 percentiles
- 🔍 Query grouping and normalization
- ⚠️ Error tracking per query
- 📈 Query execution trends over time
- 🔥 Highlighting queries slower than 1 second

## Best Practices

1. **Initialize early**: Call `init()` and `startAgent()` BEFORE requiring database modules
2. **Use Express middleware**: For Express apps, use the provided middleware for automatic instrumentation
3. **Sample in production**: Set `sampleRate` to a value < 1.0 in high-traffic production environments
4. **Add context**: Use `span.setAttribute()` to add business context to your traces
5. **Graceful shutdown**: Call `stopAgent()` before your application exits
6. **Database instrumentation**: Enable `instrumentDatabase: true` to track slow queries and errors

## Environment Variables

You can also configure the agent using environment variables:

```bash
DEVSKIN_SERVER_URL=https://api-monitoring.devskin.com
DEVSKIN_API_KEY=your-api-key
DEVSKIN_APPLICATION_ID=your-application-id
DEVSKIN_SERVICE_NAME=my-service
DEVSKIN_ENVIRONMENT=production
DEVSKIN_SAMPLE_RATE=1.0
```

```javascript
const agent = init({
  serverUrl: process.env.DEVSKIN_SERVER_URL,
  apiKey: process.env.DEVSKIN_API_KEY,
  applicationId: process.env.DEVSKIN_APPLICATION_ID,  // 🔑 REQUIRED
  serviceName: process.env.DEVSKIN_SERVICE_NAME,
  environment: process.env.DEVSKIN_ENVIRONMENT,
  sampleRate: parseFloat(process.env.DEVSKIN_SAMPLE_RATE || '1.0'),
});
```

## License

MIT
