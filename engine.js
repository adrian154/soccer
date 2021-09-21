// the game "engine"

// dependencies
const config = require("./config.json").gamecore;

// helpers
const doNothing = () => {};
const distSquared = (x1, y1, x2, y2) => {
    let dx = x2 - x1;
    let dy = y2 - y1;
    return dx * dx + dy * dy;    
};

module.exports = class {

    constructor() {
        
        // internal state
        this.resetBall();
        this.players = {};
        this.numPlayers = 0;
        this.nextPlayerID = 0;
        this.score = [0, 0];
        this.eventHandlers = {
            goal: doNothing
        };

        // start physics tick
        setInterval(() => this.tick(), 1000 / config.ticksPerSecond);

    }

    newPlayer() {
        
        const id = this.nextPlayerID++;
        const player = {
            id: id,
            name: "unnamed",
            pos: {
                x: Math.random() * config.field.width,
                y: Math.random() * config.field.height
            },
            vel: {
                x: 0,
                y: 0
            },
            controls: {
                up: false,
                down: false,
                left: false,
                right: false
            },
            team: id % 2 == 0 ? 0 : 1
        };

        this.players[id] = player;
        this.numPlayers++;
        return player;

    }

    removePlayer(id) {
        this.numPlayers--;
        delete this.players[id];
    }

    resetBall() {
        this.ball = {
            pos: {
                x: config.field.width / 2,
                y: config.field.height / 2
            },
            vel: {
                x: 0,
                y: 0
            },
            lastHitBy: null
        };
    }

    updatePlayers(dt) {

        for(const player of Object.values(this.players)) {
            
            // update controls
            const accX = ((player.controls.left ? -1 : 0) + (player.controls.right ? 1 : 0)) * config.player.acceleration;
            const accY = ((player.controls.up ? -1 : 0) + (player.controls.down ? 1 : 0)) * config.player.acceleration;

            // integrate acceleration
            player.vel.x += accX * dt;
            player.vel.y += accY * dt;

            // apply friction
            player.vel.x *= 1 - config.player.friction;
            player.vel.y *= 1 - config.player.friction;

            // integrate position
            let nextPosX = player.vel.x * dt + player.pos.x;
            let nextPosY = player.vel.y * dt + player.pos.y;

            // keep player outside of other players
            for(const player2 of Object.values(this.players)) {
                if(player.id == player2.id) continue;

                const dx = player2.pos.x - nextPosX;
                const dy = player2.pos.y - nextPosY;
                const distSq = dx * dx + dy * dy;
                
                // distSq < (2 * playerRadius)^2
                if(distSq < 4 * config.player.radius * config.player.radius) {
                    let dist = Math.sqrt(distSq);
                    let overlap = 2 * config.player.radius - dist;
                    nextPosX -= overlap * dx / dist;
                    nextPosY -= overlap * dy / dist;
                    player2.pos.x += overlap * dx / dist;
                    player2.pos.y += overlap * dy / dist;
                }
                
            }

            // enforce boundaries
            if(nextPosX < config.player.radius) nextPosX = config.player.radius;
            if(nextPosY < config.player.radius) nextPosY = config.player.radius;
            if(nextPosX + config.player.radius > config.field.width) nextPosX = config.field.width - config.player.radius;
            if(nextPosY + config.player.radius > config.field.height) nextPosY = config.field.height - config.player.radius

            // update position finally
            player.pos.x = nextPosX;
            player.pos.y = nextPosY;

        }

    }

    updateBall(dt) {

        const ball = this.ball;

        // apply friction
        ball.vel.x *= 1 - config.ball.friction;
        ball.vel.y *= 1 - config.ball.friction;

        // integrate position
        let nextPosX = ball.pos.x + ball.vel.x * dt;
        let nextPosY = ball.pos.y + ball.vel.y * dt;

        // update based on players
        for(const player of Object.values(this.players)) {

            let dx = nextPosX - player.pos.x;
            let dy = nextPosY - player.pos.y;
            let distSq = dx * dx + dy * dy;
            const minDistSq = (config.ball.radius + config.player.radius) * (config.ball.radius + config.player.radius);

            // if they intersect...
            if(distSq < minDistSq) {

                const dist = Math.sqrt(distSq);

                // reflect ball with own speed
                const massFactor = config.player.mass / config.ball.mass;
                const vdx = (ball.vel.x - player.vel.x * massFactor);
                const vdy = (ball.vel.y - player.vel.y * massFactor);
                const ballSpeed = Math.sqrt(vdx * vdx + vdy * vdy) * config.ball.bounciness;

                // update velocity
                ball.vel.x = ballSpeed * dx / dist;
                ball.vel.y = ballSpeed * dy / dist;

                // de-overlap
                const overlap = config.ball.radius + config.player.radius - dist;
                nextPosX += overlap * dx / dist;
                nextPosY += overlap * dy / dist;
                player.pos.x -= overlap * dx / dist;
                player.pos.y -= overlap * dy / dist;

            }

        }

        // enforce boundaries
        if(nextPosX < config.ball.radius) {
            nextPosX = config.ball.radius;
            ball.vel.x *= -config.ball.bounciness;
        }

        if(nextPosY < config.ball.radius) {
            nextPosY = config.ball.radius;
            ball.vel.y *= -config.ball.bounciness;
        }

        if(nextPosX + config.ball.radius > config.field.width) {
            nextPosX = config.field.width - config.ball.radius;
            ball.vel.x *= -config.ball.bounciness;
        }

        if(nextPosY + config.ball.radius > config.field.height) {
            nextPosY = config.field.height - config.ball.radius;
            ball.vel.y *= -config.ball.bounciness;
        }

        ball.pos.x = nextPosX;
        ball.pos.y = nextPosY;

        // check goals
        // top goal
        const margin = (config.field.width - config.goals.width) / 2;
        if(ball.pos.x > margin && ball.pos.x < config.field.width - margin) {
            if(ball.pos.y < config.goals.height) {
                this.resetBall();
                this.score[0]++;
            } else if(ball.pos.y > config.field.height - config.goals.height) {
                this.resetBall();
                this.score[1]++;
            }
        }
    }
    
    tick() {

        // on the first tick, run at normal speed
        // otherwise, adapt based on tick time fluctuations
        let dt = 1 / config.ticksPerSecond;

        this.updatePlayers(dt);
        this.updateBall(dt);

        // --- END OF TICK
        this.lastTick = Date.now();

    }

};