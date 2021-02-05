const doNothing = () => {};

const WSClient = class {
    
    constructor(host) {
        
        this.ws = new WebSocket(host);
        
        this.eventHandlers = {
            close: doNothing,
            error: doNothing,
            message: doNothing
        };

        this.messageHandlers = {};

        this.ws.addEventListener("close", (event) => this.eventHandlers.close(event));
        this.ws.addEventListener("error", (event) => this.eventHandlers.error(event));
        this.ws.addEventListener("message", (event) => {

            const message = JSON.parse(event.data);
            if(this.messageHandlers[message.type]) {
                this.messageHandlers[message.type](message.payload);
            } else {
                throw new Error(`No message handler for message "${message.type}"`);
            }

        });

    }

    connected() {
        return this.ws.readyState === WebSocket.OPEN;
    }

    async waitConnect() {
        
        // don't wait if done already
        if(this.ws.readyState == WebSocket.OPEN) return;

        // otherwise...
        return new Promise((resolve, reject) => {
            this.ws.addEventListener("open", resolve);
        });

    }

    on(event, handler) {
        if(this.eventHandlers[event]) {
            this.eventHandlers[event] = handler;
        } else {
            throw new Error(`No such event "${event}"`);
        }
    }

    message(name, handler) {
        this.messageHandlers[name] = handler;
    }

    send(type, payload) {
        this.ws.send(JSON.stringify({
            type: type,
            payload: payload
        }));
    }

};

const WS = {
    create: (host) => new WSClient(host),
    connect: async (host) => {
        const socket = new WSClient(host);
        await socket.connect();
        return socket;
    }
};

Object.freeze(WS);