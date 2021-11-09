require('dotenv').config();
import fs from 'fs';
import express from "express";
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io: Socket = new Server(server);
const bodyParser = require('body-parser')
const path = require('path');
const axios = require('axios').default;
import ical from 'ical';
const WebSocketClient = require('websocket').client;
import { SettingsObject } from './types'
import { Socket } from 'socket.io';



io.on("connection", (socket: Socket) => {
    console.log(`Connected: ${socket}`)
    socket.emit("settings", settings);
    // ...
});




//Load file containing user inputs & selections
const SETTINGS_FILE_PATH = process.env.SETTINGS_FILE_PATH;

let settings: SettingsObject;
if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify({
        users: [],
        icalData: [],
        devices: [],
        carHeaterEvents: []
    }))
} else {
    //@ts-ignore
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH))
    if (!settings.users) { settings.users = [] }
    if (!settings.icalData) { settings.icalData = [] }
    if (!settings.states) { settings.states = [] }
    if (!settings.carHeaterEvents) { settings.carHeaterEvents = [] }
}
const port = process.env.PORT;
const HA_ROOT_URL = `http://${process.env.HA_HOST}:${process.env.HA_PORT}`;
const HA_TOKEN = process.env.HA_TOKEN;
let HA_SENSOR_OUTDOOR_TEMPERATURE = process.env.HA_SENSOR_OUTDOOR_TEMPERATURE;
let HA_SENSOR_INDOOR_TEMPERATURE = process.env.HA_SENSOR_INDOOR_TEMPERATURE;

let OUTDOOR_TEMPERATURE;

//const ws = new WebSocket(`ws://${process.env.HA_HOST}:${process.env.HA_PORT}/api/websocket`);

const ws = new WebSocketClient();
let wsConnection;

const SWITCH_ACTIONS = ["turn_on", "turn_off"]

//HA message types
const AUTH_REQUIRED = "auth_required";
const AUTH_OK = "auth_ok";
const RESULT = "result";
const EVENT = "event";

//APP state
let message_id = 0;
let auth_ok;
let resultQueue = {};
let persistedMessages = {};

function clearPersistedQueue() {
    //console.log("clear persistance")
    //console.log(persistedMessages)
    for (const key in persistedMessages) {
        //@ts-ignore
        if (Object.hasOwnProperty.call(object, key)) {
            //@ts-ignore
            const element = object[key];
            ws.send(element);
            delete persistedMessages[key];
        }
    }
    //console.log(persistedMessages)
}
function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings));
    io.emit("settings", settings);
}

function updateIcalData() {
    const { icalData } = settings;
    for (let index = 0; index < icalData.length; index++) {
        const element = icalData[index];
        axios.get(element.path).then(res => {
            icalData[index].data = ical.parseICS(res.data);
            saveSettings();
        }).catch(err => {
            console.log(err)
        })
    }
}
updateIcalData();
setInterval(updateIcalData, 1000 * 60 * 10);

function handleIcalEvents() {
    const { icalData } = settings;
    icalData.forEach((entity, i) => {
        const { name, path, data } = entity;
        if (data) {
            const dt = new Date();
            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    const ev = data[key];
                    if (dt.getTime() > ev.start.getTime()) {

                        //Handle events with start time in future
                    } else {
                        //Handle events with start time in past
                    }
                }
            }
        }
        if (OUTDOOR_TEMPERATURE) { console.log(OUTDOOR_TEMPERATURE) }
    })
}

setInterval(handleIcalEvents, 1000 * 60);


//Unique messageID to be returned with homeassistant result messages
function getMessageId() {
    message_id++;
    return message_id;
}
ws.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

ws.on("connect", connection => {
    connection.on('error', function (error) {
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function () {
        console.log('echo-protocol Connection Closed');
        wsConnection = undefined;
        reconnect();
    });
    connection.on("message", message => {
        const json = JSON.parse(message.utf8Data);
        //console.log(json.type)
        try {
            if (json.type && json.type) {
                switch (json.type) {
                    case AUTH_REQUIRED:
                        connection.sendUTF(JSON.stringify({
                            "type": "auth",
                            "access_token": HA_TOKEN
                        }))
                        break;
                    case AUTH_OK:
                        auth_ok = true;
                        wsConnection = connection;
                        //console.log("auth")
                        authenticated();
                        break;
                    case RESULT:
                        //console.log(resultQueue[json.id])
                        //console.log(json)
                        if (resultQueue[json.id] && json.success) {
                            //console.log("success")
                            if (resultQueue[json.id].message.type === "get_states") {
                                saveStates(json.result)
                            }
                            delete resultQueue[json.id];

                        }
                        break;
                    case EVENT:
                        if (json.event.event_type === "state_changed") {
                            const { entity_id, old_state, new_state, origin,
                                time_fired, context } = json.event;
                            for (let index = 0; index < settings.states.length; index++) {
                                const element = settings.states[index];
                                if (element.entity_id = entity_id) {
                                    settings.states[index].state = new_state
                                    settings.states[index].changed = time_fired
                                }
                            }

                            //console.log(json)
                        } else {
                            //console.log(json.event.event_type)
                        }

                        break;
                    default:
                        break;
                }
            }
        } catch (error) {
            console.log(error)
        }
    })


})


function connectWS() {
    ws.connect(`ws://${process.env.HA_HOST}:${process.env.HA_PORT}/api/websocket`);
}
reconnect();
function reconnect() {
    if (!wsConnection) {
        connectWS();
        setTimeout(reconnect, 5000);
    }
}

function authenticated() {
    clearPersistedQueue()
    subscribeEvents()
    getStates()
}

function getStates() {
    sendHaMessage({
        "type": "get_states"
    })
}
function subscribeEvents() {
    sendHaMessage({
        "type": "subscribe_events",
        // Optional
        "event_type": "state_changed"
    })
}

function saveStates(states) {
    if (states && Array.isArray(states)) {
        states.forEach(s => {
            const { entity_id, state, last_changed } = s;
            const i = settings.states.findIndex((val) => val.entity_id === entity_id);
            if (i >= 0) {
                settings.states[i].state = state
                settings.states[i].changed = last_changed
                settings.states[i].HA_StateObject = s;
            } else {
                settings.states.push({
                    entity_id: entity_id,
                    state: state,
                    changed: last_changed,
                    HA_StateObject: s
                })
            }

        })
    }
    saveSettings()
    //console.log(settings.states)
}

function turnOnLight(entityId) {
    if (auth_ok) {
        sendHaMessage({
            "type": "call_service",
            "domain": "light",
            "service": "turn_off",
            "service_data": {
                "entity_id": entityId
            }
        })
    }
}
function operateSwitch(service, entityId) {
    if (auth_ok) {
        sendHaMessage({
            "type": "call_service",
            "domain": "switch",
            "service": service,
            "service_data": {
                "entity_id": entityId
            }
        })
    }
}

app.use(express.static(path.join(__dirname, '..', '..', 'client/build')))
app.use(bodyParser.json())

app.get('/api/temperature/outdoor', (req, res) => {
    axios.get(`${HA_ROOT_URL}/api/states/${HA_SENSOR_OUTDOOR_TEMPERATURE}`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        if (result.data && result.data.state) {
            try {
                OUTDOOR_TEMPERATURE = Number.parseFloat(result.data.state);
            } catch (error) {

            }
        }
        res.send(`${OUTDOOR_TEMPERATURE}`)
    }).catch(err => {
        console.log(err)
        res.status(400).send()
    })
})
app.get('/api/clear_states', (req, res) => {
    settings.states = [];
    saveSettings()
    res.send(`ok`);
})
app.get('/api/temperature/indoor', (req, res) => {
    axios.get(`${HA_ROOT_URL}/api/states/${HA_SENSOR_INDOOR_TEMPERATURE}`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        if (result.data && result.data.state) {
            try {
                OUTDOOR_TEMPERATURE = Number.parseFloat(result.data.state);
            } catch (error) {

            }
        }
        res.send(`${OUTDOOR_TEMPERATURE}`)
    }).catch(err => {
        console.log(err)
        res.status(400).send()
    })
})

function sendHaMessage(object) {
    let id = getMessageId();
    resultQueue[id] = {
        timeStamp: new Date(),
        message: {
            "id": id,
            ...object
        }
    }
    if (wsConnection) {
        wsConnection.sendUTF(JSON.stringify(resultQueue[id].message))
    } else {
        persistedMessages[id] = JSON.stringify(resultQueue[id].message);
    }
}

app.get('/api/ha/states/', (req, res) => {
    sendHaMessage({ "type": "get_states" });
    axios.get(`${HA_ROOT_URL}/api/states`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        res.json(result.data)
    }).catch(err => {
        console.log(err)
        res.status(400).send()
    })
})

app.get('/api/ha/services/', (req, res) => {
    axios.get(`${HA_ROOT_URL}/api/services`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        res.json(result.data)
    }).catch(err => {
        console.log(err)
        res.status(400).send()
    })
})

app.get('/api/ha/events/', (req, res) => {
    axios.get(`${HA_ROOT_URL}/api/events`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        res.json(result.data)
    }).catch(err => {
        console.log(err)
        res.status(400).send()
    })
})

app.post(`/api/ha/services/switch/:action`, (req, res) => {
    console.log("req")
    const action = req.params.action;
    const body = req.body;
    operateSwitch(action, body.entity_id)
})

server.listen(port, () => {
    console.log(`homeassist_srv listening at http://localhost:${port}`)
})