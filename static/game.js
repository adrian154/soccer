// constants
// team colors = hues
const TEAM_COLORS = [50, 200];

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
const debug = Boolean(new URL(window.location).searchParams.get("debug"));

// game state
let curSnapshot, prevSnapshot, curTime, prevTime, finishInterpTime;
let score;
let gameProperties;
let animating = false;

// helpers
// note: lerp isn't actually linear, it's whatever scheme i'm toying with at the moment
const lerp = (start, end, dt) => start + dt * (end - start);
const getPlayer = (game, id) => game.players.find(player => player.id == id);
const updateName = () => {
    socket.send("set name", prompt("What would you like to change your name to?"));
};

// gameloop methods
const setupSocket = (socket) => {

    socket.message("init", (payload) => {
        selfID = payload;
    });

    socket.message("ping", (payload) => {
        socket.send("pong", 0);
    });

    socket.message("tick", (payload) => {

        if(curSnapshot) {
            prevSnapshot = curSnapshot;
            prevTime = curTime;
        }

        curSnapshot = payload.snapshot;
        curTime = payload.time;
        score = payload.score;
        finishInterpTime = Date.now() + (curTime - prevTime);

        if(debug) console.log("tick");
        if(!animating && prevSnapshot && curSnapshot) {
            animate();
        }

    });

};

const drawBackground = (ctx, dt) => {

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
    ctx.fillText(score[0] + ":" + score[1], ctx.canvas.width / 2, ctx.canvas.height / 2 + 12);

    // goals
    const margin = (ctx.canvas.width - gameProperties.goals.width) / 2;
    ctx.fillStyle = `hsl(${TEAM_COLORS[0]}, 75%, 50%)`;
    ctx.fillRect(margin, 0, gameProperties.goals.width, gameProperties.goals.height);
    ctx.fillStyle = `hsl(${TEAM_COLORS[1]}, 75%, 50%)`;
    ctx.fillRect(margin, ctx.canvas.height - gameProperties.goals.height, gameProperties.goals.width, gameProperties.goals.height);
    ctx.globalAlpha = 1.0;

};

const drawBall = (ctx, dt) => {

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(
        lerp(prevSnapshot.ball.pos.x, curSnapshot.ball.pos.x, dt),
        lerp(prevSnapshot.ball.pos.y, curSnapshot.ball.pos.y, dt),
        gameProperties.ballRadius,
        0, 2 * Math.PI
    );
    ctx.closePath();
    ctx.fill();

};

const drawPlayer = (prev, cur, ctx, dt) => {

    const isSelf = prev.id === selfID;
    ctx.fillStyle = `hsl(${TEAM_COLORS[prev.team]}, ${isSelf ? 100 : 75}%, 50%)`;

    const x = lerp(prev.pos.x, cur.pos.x, dt);
    const y = lerp(prev.pos.y, cur.pos.y, dt);
    ctx.beginPath();
    ctx.arc(
        x, y,
        gameProperties.playerRadius,
        0, 2 * Math.PI  
    );
    ctx.closePath();
    ctx.fill();

    ctx.textAlign = "center";

    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.fillText(String(prev.id), x, y + 6);

    ctx.fillStyle = "#000000";
    ctx.font = "bold 12px Arial";
    ctx.fillText(prev.name, x, y - 25);

};

const drawPlayers = (ctx, dt) => {

    for(const playerID in prevSnapshot.players) {
        if(curSnapshot.players[playerID]) {
            drawPlayer(prevSnapshot.players[playerID], curSnapshot.players[playerID], ctx, dt);
        }
    }

};

const draw = (ctx) => {

    // everything is drawn one tick in the past
    // so subtract some time from Date.now() to interpolate
    const dt = 1 - (finishInterpTime - Date.now()) / (curTime - prevTime);
    if(debug) console.log(dt);
    
    drawBackground(ctx, dt);
    drawBall(ctx, dt);
    drawPlayers(ctx, dt);

};

const animate = () => {
    animating = true;
    draw(ctx);
    requestAnimationFrame(animate);
};

const handleKey = (key, state) => {
    
    switch(key) {
        case "w": controls.up = state; break;
        case "a": controls.left = state; break;
        case "s": controls.down = state; break;
        case "d": controls.right = state; break;
        case "g": if(state) updateName(); break;
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
        socket = WS.create(window.location.host, data.port);
        setupSocket(socket);
        socket.waitConnect();

    })
    .catch(error => alert("Failed to fetch server info: " + error));