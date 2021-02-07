# soccer

A multiplayer soccer game built with NodeJS + WebSocket. Still in development.

## Notes

This app does not support serving webpages over HTTPS. If you wish to do so, you must use a reverse proxy. However, since insecure websocket connections cannot be made by Javascript served on a secure connection, this app *does* support secure websocket.

To configure secure websockets, simply add an object to the `gameserver` section of the configuration:

```
{
    "gameserver": {
        "ssl": {
            "keyPath": "/path/to/private/key.pem",
            "certPath": "/path/to/cert.pem"
        }
    }
}
```

## Try it

I'm hosting a version of this game on my website [here](soccer.codesoup.dev), though it might be offline or not up-to-date.