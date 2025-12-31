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
| `serviceName` | string | *required* | Name of your service |
| `serviceVersion` | string | undefined | Version of your service |
| `environment` | string | undefined | Environment (production, staging, etc) |
| `enabled` | boolean | true | Enable/disable agent |
| `sampleRate` | number | 1.0 | Sample rate (0.0 to 1.0) |
| `instrumentHttp` | boolean | true | Auto-instrument HTTP |
| `instrumentExpress` | boolean | true | Auto-instrument Express |
| `batchSize` | number | 100 | Batch size before flushing |
| `flushInterval` | number | 10000 | Flush interval in ms |
| `debug` | boolean | false | Enable debug logging |

## Features

- ✅ Automatic HTTP request/response tracing
- ✅ Express middleware for automatic route tracing
- ✅ Manual span creation
- ✅ Distributed tracing with trace ID propagation
- ✅ Error tracking and reporting
- ✅ Sampling support
- ✅ Async context propagation
- ✅ Service discovery

## Best Practices

1. **Initialize early**: Call `init()` and `startAgent()` as early as possible in your application
2. **Use Express middleware**: For Express apps, use the provided middleware for automatic instrumentation
3. **Sample in production**: Set `sampleRate` to a value < 1.0 in high-traffic production environments
4. **Add context**: Use `span.setAttribute()` to add business context to your traces
5. **Graceful shutdown**: Call `stopAgent()` before your application exits

## Environment Variables

You can also configure the agent using environment variables:

```bash
DEVSKIN_SERVER_URL=https://api-monitoring.devskin.com
DEVSKIN_API_KEY=your-api-key
DEVSKIN_SERVICE_NAME=my-service
DEVSKIN_ENVIRONMENT=production
DEVSKIN_SAMPLE_RATE=1.0
```

```javascript
const agent = init({
  serverUrl: process.env.DEVSKIN_SERVER_URL,
  apiKey: process.env.DEVSKIN_API_KEY,
  serviceName: process.env.DEVSKIN_SERVICE_NAME,
  environment: process.env.DEVSKIN_ENVIRONMENT,
  sampleRate: parseFloat(process.env.DEVSKIN_SAMPLE_RATE || '1.0'),
});
```

## License

MIT
