"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "createDebugMiddleware", {
    enumerable: true,
    get: ()=>createDebugMiddleware
});
function _chalk() {
    const data = /*#__PURE__*/ _interopRequireDefault(require("chalk"));
    _chalk = function() {
        return data;
    };
    return data;
}
function _ws() {
    const data = require("ws");
    _ws = function() {
        return data;
    };
    return data;
}
const _createHandlersFactory = require("./createHandlersFactory");
const _networkResponse = require("./messageHandlers/NetworkResponse");
const _log = require("../../../../log");
const _env = require("../../../../utils/env");
const _net = require("../../../../utils/net");
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const debug = require("debug")("expo:metro:debugging:middleware");
function createDebugMiddleware({ projectRoot , serverBaseUrl  }) {
    // Load the React Native debugging tools from project
    // TODO: check if this works with isolated modules
    const { createDevMiddleware  } = require("@react-native/dev-middleware");
    const { middleware , websocketEndpoints  } = createDevMiddleware({
        projectRoot,
        serverBaseUrl,
        logger: createLogger(_chalk().default.bold("Debug:")),
        unstable_customInspectorMessageHandler: (0, _createHandlersFactory.createHandlersFactory)(),
        unstable_experiments: {
            // Enable the Network tab in React Native DevTools
            enableNetworkInspector: true,
            // Only enable opening the browser version of React Native DevTools when debugging.
            // This is useful when debugging the React Native DevTools by going to `/open-debugger` in the browser.
            enableOpenDebuggerRedirect: _env.env.EXPO_DEBUG
        }
    });
    const debuggerWebsocketEndpoint = websocketEndpoints["/inspector/debug"];
    // NOTE(cedric): add a temporary websocket to handle Network-related CDP events
    websocketEndpoints["/inspector/network"] = createNetworkWebsocket(debuggerWebsocketEndpoint);
    // Explicitly limit debugger websocket to loopback requests
    debuggerWebsocketEndpoint.on("connection", (socket, request)=>{
        if (!(0, _net.isLocalSocket)(request.socket) || !(0, _net.isMatchingOrigin)(request, serverBaseUrl)) {
            // NOTE: `socket.close` nicely closes the websocket, which will still allow incoming messages
            // `socket.terminate` instead forcefully closes down the socket
            socket.terminate();
        }
    });
    return {
        debugMiddleware (req, res, next) {
            // The debugger middleware is skipped entirely if the connection isn't a loopback request
            if ((0, _net.isLocalSocket)(req.socket)) {
                return middleware(req, res, next);
            } else {
                return next();
            }
        },
        debugWebsocketEndpoints: websocketEndpoints
    };
}
function createLogger(logPrefix) {
    return {
        info: (...args)=>_log.Log.log(logPrefix, ...args),
        warn: (...args)=>_log.Log.warn(logPrefix, ...args),
        error: (...args)=>_log.Log.error(logPrefix, ...args)
    };
}
/**
 * This adds a dedicated websocket connection that handles Network-related CDP events.
 * It's a temporary solution until Fusebox either implements the Network CDP domain,
 * or allows external domain agents that can send messages over the CDP socket to the debugger.
 * The Network websocket rebroadcasts events on the debugger CDP connections.
 */ function createNetworkWebsocket(debuggerWebsocket) {
    const wss = new (_ws()).WebSocketServer({
        noServer: true,
        perMessageDeflate: true,
        // Don't crash on exceptionally large messages - assume the device is
        // well-behaved and the debugger is prepared to handle large messages.
        maxPayload: 0
    });
    wss.on("connection", (networkSocket)=>{
        networkSocket.on("message", (data)=>{
            try {
                // Parse the network message, to determine how the message should be handled
                const message = JSON.parse(data.toString());
                if (message.method === "Expo(Network.receivedResponseBody)" && message.params) {
                    // If its a response body, write it to the global storage
                    const { requestId , ...requestInfo } = message.params;
                    _networkResponse.NETWORK_RESPONSE_STORAGE.set(requestId, requestInfo);
                } else if (message.method.startsWith("Network.")) {
                    // Otherwise, directly re-broadcast the Network events to all connected debuggers
                    debuggerWebsocket.clients.forEach((debuggerSocket)=>{
                        if (debuggerSocket.readyState === debuggerSocket.OPEN) {
                            debuggerSocket.send(data.toString());
                        }
                    });
                }
            } catch (error) {
                debug("Failed to handle Network CDP event", error);
            }
        });
    });
    return wss;
}

//# sourceMappingURL=createDebugMiddleware.js.map