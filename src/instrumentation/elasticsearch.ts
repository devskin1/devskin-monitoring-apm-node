import { Agent } from '../agent';
import { SpanBuilder } from '../span';
import { SpanKind, SpanStatus } from '../types';

/**
 * Instrument Elasticsearch client for database monitoring
 */
export function instrumentElasticsearch(agent: Agent): void {
  try {
    let elasticsearch: any;
    try {
      elasticsearch = require('@elastic/elasticsearch');
    } catch {
      return;
    }

    const config = agent.getConfig();
    const originalTransport = elasticsearch.Client.prototype.transport;

    // Override transport.request to intercept all requests
    Object.defineProperty(elasticsearch.Client.prototype, 'transport', {
      get() {
        return originalTransport;
      },
      set(transport: any) {
        if (transport && transport.request) {
          const originalRequest = transport.request.bind(transport);

          transport.request = function (params: any, options: any) {
            if (!agent.shouldSample()) {
              return originalRequest(params, options);
            }

            const method = params?.method || 'GET';
            const path = params?.path || '/';
            const body = params?.body;

            // Extract operation from path
            const operation = path.split('/')[1] || 'unknown';

            const span = new SpanBuilder(
              `elasticsearch.${operation}`,
              SpanKind.CLIENT,
              config.serviceName!,
              config.serviceVersion,
              config.environment,
              agent
            );

            span.setAttributes({
              'db.system': 'elasticsearch',
              'db.operation': `${method} ${path}`,
              'db.statement': body ? JSON.stringify(body).substring(0, 1000) : '',
              'http.method': method,
              'http.url': path,
            });

            span.setAttribute('span.kind', 'client');

            const result = originalRequest(params, options);

            if (result && typeof result.then === 'function') {
              return result
                .then((res: any) => {
                  span.setStatus(SpanStatus.OK);
                  if (res?.body?.hits?.total) {
                    span.setAttribute('db.rows_affected', res.body.hits.total.value || res.body.hits.total);
                  }
                  span.end();
                  return res;
                })
                .catch((err: any) => {
                  span.setStatus(SpanStatus.ERROR, err.message);
                  span.setAttribute('error', true);
                  span.setAttribute('error.message', err.message);
                  span.end();
                  throw err;
                });
            }

            span.end();
            return result;
          };
        }

        originalTransport.call(this, transport);
      },
    });

    if (config.debug) {
      console.log('[DevSkin Agent] Elasticsearch instrumentation enabled');
    }
  } catch (error: any) {
    if (agent.getConfig().debug) {
      console.error('[DevSkin Agent] Failed to instrument Elasticsearch:', error.message);
    }
  }
}
