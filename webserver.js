// handle web-facing layer of the app

// dependencies
const Express = require("express");
const config = require("./config.json");

// create app
const app = Express();

// serve static files
app.use(Express.static("static"));

// distribute server info
app.get("/game-info", (req, res) => {
    res.json({
        port: config.gameserver.port,
        field: config.gamecore.field,
        playerRadius: config.gamecore.player.radius,
        ballRadius: config.gamecore.ball.radius,
        goals: config.gamecore.goals,
        tickrate: config.gameserver.ticksPerSecond
    });
});

// 404: redirect to central page
app.use((req, res, next) => {
    res.redirect("/");
});

// listen
app.listen(config.webserver.port, () => {
    console.log("Webserver started listening on port " + config.webserver.port);
});

module.exports = app;