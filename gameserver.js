// handle websocket-side layer of the app

// dependencies
const WSHelper = require("./wshelper.js");
const config = require("./config.json").gameserver;

module.exports = class {

    constructor(engine) {
        
        // store engine
        this.engine = engine;
        
        // setup event handlers
        this.ws = new WSHelper.Server(config.port, config.ssl);

        this.ws.on("connect", (client) => {

            if(engine.numPlayers < config.maxPlayers) {
                client.player = engine.newPlayer();
                client.alive = true;
                client.send("init", client.player.id);
            } else {
                client.close("The server is full.");
            }

            client.on("close", () => {
                if(client.player) {
                    engine.removePlayer(client.player.id);
                }
            });

        });

        this.ws.message("controls", (client, payload) => {
            client.player.controls = payload;
        });

        this.ws.message("set name", (client, payload) => {
            
            // validate name
            const name = payload.slice(0, 20).trim();
            if(name.length == 0) {
                client.player.name = "unnamed";
            } else {
                client.player.name = name;
            }

        });

        this.ws.message("pong", (client, payload) => {
            client.alive = true;
        });

        // heartbeats
        this.doHeartbeat();
        this.doTick();

    }

    doHeartbeat() {
        setInterval(() => {

            // remove any clients that didn't respond to the last heartbeat
            for(const client of this.ws.clients) {

                if(!client.alive) {

                    // execute order 66
                    client.close("Timed out");

                } else {
                    client.alive = false;
                    client.send("ping", 0);
                }

            }

        }, config.heartbeatInterval);
    }

    doTick() {

        setInterval(() => {

            // stringify once
            const packet = JSON.stringify({
                type: "tick",
                payload: {
                    snapshot: {
                        players: this.engine.players,
                        ball: this.engine.ball
                    },  
                    score: this.engine.score,
                    time: Date.now()
                }
            });

            for(const client of this.ws.clients) {
                client.sendRaw(packet);    
            }

        }, 1000 / config.ticksPerSecond);

    }

}