const webServer = require("./webserver.js");
const engine = new (require("./engine.js"))();
const gameServer = new (require("./gameserver.js"))(engine);