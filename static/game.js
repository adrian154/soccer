// constants
// team colors = hues
const TEAM_COLORS = [0, 120];

// canvas
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

// other globals... i know, i know
const controls = {
    up: false,
    down: false,
    left: false,
    right: false
};

let socket;
let selfID;

// game state
let lastTickTime;
let game;
let gameProperties;
let animating = false;

// helpers
const getPlayer = (game, id) => game.players.find(player => player.id == id);

// gameloop methods
const setupSocket = (socket) => {

    socket.message("init", (payload) => {
        selfID = payload;
    });

    socket.message("ping", (payload) => {
        socket.send("pong", 0);
    });

    socket.message("tick", (payload) => {
        
        if(payload.tickTime - Date.now() > 20) {
            console.error("Dropping a tick due to excessive latency");
        } else {
            const isFirstTick = Boolean(game);
            lastTickTime = payload.tickTime;
            game = payload;
            if(!animating) {
                animate();
            }
        }

    });

};

const drawBackground = (game, ctx) => {

    // backdrop
    ctx.fillStyle  ="#ffffff";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // center line
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ff0000";
    ctx.beginPath();
    ctx.moveTo(0, ctx.canvas.height / 2);
    ctx.lineTo(ctx.canvas.width, ctx.canvas.height / 2);
    ctx.closePath();
    ctx.stroke();

    // score
    ctx.globalAlpha = 0.5;
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";
    ctx.fillText(game.score[0] + ":" + game.score[1], ctx.canvas.width / 2, ctx.canvas.height / 2 + 12);
    ctx.globalAlpha = 1.0;

    // goals

};

const drawBall = (ball, ctx, dt) => {

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(
        ball.pos.x + ball.vel.x * dt,
        ball.pos.y + ball.vel.y * dt,
        gameProperties.ballRadius,
        0, 2 * Math.PI
    );
    ctx.closePath();
    ctx.fill();

};

const drawPlayer = (player, ctx, dt) => {

    const isSelf = player.id === selfID;
    ctx.fillStyle = `hsl(${TEAM_COLORS[player.team]}, ${isSelf ? 100 : 75}%, 50%)`;

    ctx.beginPath();
    ctx.arc(
        player.pos.x + dt * player.vel.x,
        player.pos.y + dt * player.vel.y,
        gameProperties.playerRadius,
        0, 2 * Math.PI  
    );
    ctx.closePath();
    ctx.fill();

};

const draw = (ctx, game) => {

    // used to interpolate things
    // (not well, but.. it fills in the gaps, sort of.)
    const dt = (Date.now() - lastTickTime) / 1000;
    
    drawBackground(game, ctx);
    drawBall(game.ball, ctx, dt);

    for(const player of game.players) {
        drawPlayer(player, ctx, dt);
    }

};

const animate = () => {
    animating = true;
    draw(ctx, game);
    requestAnimationFrame(animate);
};

const handleKey = (key, state) => {
    
    switch(key) {
        case "w": controls.up = state; break;
        case "a": controls.left = state; break;
        case "s": controls.down = state; break;
        case "d": controls.right = state; break;
    }

    if(socket.connected()) {
        socket.send("controls", controls);
    }

};

window.addEventListener("keydown", (event) => handleKey(event.key, true));
window.addEventListener("keyup", (event) => handleKey(event.key, false));

// connect
fetch("/game-info") 
    .then(response => response.json())
    .then(data => {
        
        // store properties
        gameProperties = data;

        // resize canvas
        canvas.width = gameProperties.field.width;
        canvas.height = gameProperties.field.height;

        // setup socket
        socket = WS.create(`ws://${window.location.host}:${data.port}`);
        setupSocket(socket);
        socket.waitConnect();

    })
    .catch(error => alert("Failed to fetch server info: " + error));