"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanStatus = exports.SpanKind = void 0;
var SpanKind;
(function (SpanKind) {
    SpanKind["SERVER"] = "server";
    SpanKind["CLIENT"] = "client";
    SpanKind["INTERNAL"] = "internal";
    SpanKind["PRODUCER"] = "producer";
    SpanKind["CONSUMER"] = "consumer";
})(SpanKind || (exports.SpanKind = SpanKind = {}));
var SpanStatus;
(function (SpanStatus) {
    SpanStatus["OK"] = "ok";
    SpanStatus["ERROR"] = "error";
})(SpanStatus || (exports.SpanStatus = SpanStatus = {}));
//# sourceMappingURL=types.js.map