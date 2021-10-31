# Homeassistant nodejs/react server


Why:
- Simplest examples on how to use homeassistant API (http & websocket), this may end up as a bigger project...
- Need to program features using standard languages instead of weird yaml/script mix -> use nodejs & react, make your own ui...

How to install:
- You need a server, which you propably already have since you are running home assistant
- If you are not familiar with nodejs & react, learn them first
- Git clone https://github.com/JR-Y/homeassistant_serv.git
- install in both server & client
- in server folder add your own ".env" file
- to run production build the client "yarn build" in the folder, then in server folder run "node index", this will serve the react app from build folder static files on the same port


Search tags: 
How to use Home assistant REST API
How to use Home assistant WebSocket API
Home assistant with nodejs & react