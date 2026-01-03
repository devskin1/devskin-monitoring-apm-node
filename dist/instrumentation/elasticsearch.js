"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instrumentElasticsearch = instrumentElasticsearch;
const span_1 = require("../span");
const types_1 = require("../types");
function instrumentElasticsearch(agent) {
    try {
        let elasticsearch;
        try {
            elasticsearch = require('@elastic/elasticsearch');
        }
        catch {
            return;
        }
        const config = agent.getConfig();
        const originalTransport = elasticsearch.Client.prototype.transport;
        Object.defineProperty(elasticsearch.Client.prototype, 'transport', {
            get() {
                return originalTransport;
            },
            set(transport) {
                if (transport && transport.request) {
                    const originalRequest = transport.request.bind(transport);
                    transport.request = function (params, options) {
                        if (!agent.shouldSample()) {
                            return originalRequest(params, options);
                        }
                        const method = params?.method || 'GET';
                        const path = params?.path || '/';
                        const body = params?.body;
                        const operation = path.split('/')[1] || 'unknown';
                        const span = new span_1.SpanBuilder(`elasticsearch.${operation}`, types_1.SpanKind.CLIENT, config.serviceName, config.serviceVersion, config.environment, agent);
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
                                .then((res) => {
                                span.setStatus(types_1.SpanStatus.OK);
                                if (res?.body?.hits?.total) {
                                    span.setAttribute('db.rows_affected', res.body.hits.total.value || res.body.hits.total);
                                }
                                span.end();
                                return res;
                            })
                                .catch((err) => {
                                span.setStatus(types_1.SpanStatus.ERROR, err.message);
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
    }
    catch (error) {
        if (agent.getConfig().debug) {
            console.error('[DevSkin Agent] Failed to instrument Elasticsearch:', error.message);
        }
    }
}
//# sourceMappingURL=elasticsearch.js.map