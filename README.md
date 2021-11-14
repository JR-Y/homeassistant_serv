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

Car heater function with google calendar: 
- First create a device instance of your homeassistant on-off plug
- Create a calendar with an iCal calendar path from "Secret address in iCal-format" that can be found in google calendar settings of a specific calendar
- Create a new Car heater event with a device & calendar
- Choose tags to use for heating (should occur in the calendar events summary field) api pulls tag suggestions from existing events, so create a new calendar event if no tags appear
- Select a travel time
- Heating time starts at (event.start - travel_time - 30 min - temperature_adjusted_time) and ends at (event.start-travel_time)


Search tags: 
Car heater with google calendar events
Homeassistant API, Home assistant API
How to use Home assistant REST API
How to use Home assistant WebSocket API
Home assistant with nodejs & react