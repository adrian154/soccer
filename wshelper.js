// socket.io-inspired websocket wrapper

// dependencies
const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");

// helper
const doNothing = () => {};

const Client = class {

    constructor(socket, server) {

        // attach some event handlers
        this.socket = socket;
        this.server = server;
        this.eventHandlers = {
            close: doNothing
        };

        this.socket.on("close", (code, reason) => {
            this.server.remove(this);
            this.eventHandlers.close(code, reason);
        });

    }

    on(event, func) {
        if(this.eventHandlers[event]) {
            this.eventHandlers[event] = func;
        } else {
            throw new Error(`No such event "${event}"`);
        }
    }

    close(reason) {
        this.socket.close(1000, reason);
    }

    terminate() {
        this.socket.terminate();
    }

    send(type, payload) {
        this.socket.send(JSON.stringify({type: type, payload: payload}));
    }

    sendRaw(payload) {
        this.socket.send(payload);
    }

}

const Server = class {

    constructor(port, ssl) {

        // set up internals
        if(ssl) {
            this.ws = new WebSocket.Server({
                server: (() => {
                    const server = https.createServer({
                        key: fs.readFileSync(ssl.keyPath),
                        cert: fs.readFileSync(ssl.certPath)
                    });
                    server.listen(port);
                    return server;
                })()
            });
        } else {
            this.ws = new WebSocket.Server({port: port});
        }
        
        this.clients = [];

        // set up event handling layer        
        this.eventHandlers = {
            connect: doNothing,
            error: doNothing
        };

        this.messageHandlers = {};

        this.ws.on("connection", (clientWS) => {

            const client = new Client(clientWS, this);
            this.clients.push(client);

            // set up event handlers
            clientWS.on("message", (data) => {

                let message = JSON.parse(data);
                if(this.messageHandlers[message.type]) {
                    this.messageHandlers[message.type](client, message.payload);
                } else {
                    throw new Error(`Client sent unknown message type "${message.type}"`);
                }

            });

            this.eventHandlers.connect(client);

        });

    }

    remove(client) {
        this.clients.splice(this.clients.indexOf(client), 1);
    }

    message(name, func) {
        this.messageHandlers[name] = func;
    }

    on(event, func) {
        if(this.eventHandlers[event]) {
            this.eventHandlers[event] = func;
        } else {
            throw new Error(`No such event as "${event}"`);
        }
    }

};

module.exports = {
    Server: Server
};