require('dotenv').config();
import express from "express";
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const bodyParser = require('body-parser')
const path = require('path');
const axios = require('axios').default;
import WebSocket from "ws";
//const WebSocket = require("ws");
//const ReconnectingWebSocket = require("reconnecting-websocket");

const port = process.env.PORT;
const HA_ROOT_URL = `http://${process.env.HA_HOST}:${process.env.HA_PORT}`;
const HA_TOKEN = process.env.HA_TOKEN;
let HA_SENSOR_OUTDOOR_TEMPERATURE = process.env.HA_SENSOR_OUTDOOR_TEMPERATURE;
let HA_SENSOR_INDOOR_TEMPERATURE = process.env.HA_SENSOR_INDOOR_TEMPERATURE;

const ws = new WebSocket(`ws://${process.env.HA_HOST}:${process.env.HA_PORT}/api/websocket`);

function isWsOpen() {
    return ws.readyState === ws.OPEN;
}

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
    console.log("clear persistance")
    console.log(persistedMessages)
    for (const key in persistedMessages) {
        //@ts-ignore
        if (Object.hasOwnProperty.call(object, key)) {
            //@ts-ignore
            const element = object[key];
            ws.send(element);
            delete persistedMessages[key];
        }
    }
    console.log(persistedMessages)
}

//Unique messageID to be returned with homeassistant result messages
function getMessageId() {
    message_id++;
    return message_id;
}
ws.on("open", (sock) => {
    console.log("open")
})
ws.on("close", (sock) => {
    console.log("close")
})

ws.on("message", message => {
    try {
        let json = JSON.parse(message);
        if (json.type && json.type) {
            //console.log(JSON.stringify(json))
            switch (json.type) {
                case AUTH_REQUIRED:
                    ws.send(JSON.stringify({
                        "type": "auth",
                        "access_token": HA_TOKEN
                    }))
                    break;
                case AUTH_OK:
                    auth_ok = true;
                    authenticated();
                    break;
                case RESULT:
                    console.log(resultQueue[json.id])
                    console.log(json)
                    if (resultQueue[json.id] && json.success) {
                        console.log("success")
                        delete resultQueue[json.id];
                    }
                    break;
                case EVENT:

                    break;
                default:
                    break;
            }
        }
    } catch (error) {
        console.log(error)
    }
})
function authenticated() {
    //clearPersistedQueue()
    subscribeEvents()
}
function subscribeEvents() {
    sendHaMessage({
        "type": "subscribe_events",
        // Optional
        "event_type": "state_changed"
    })
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

let OUTDOOR_TEMPERATURE;

app.use(express.static(path.join(__dirname, '..', 'client/build')))
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
    //if (isWsOpen()) {
        ws.send(JSON.stringify(resultQueue[id].message))
    // } else {
    //     persistedMessages[id] = JSON.stringify(resultQueue[id].message);
    // }
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

app.listen(port, () => {
    console.log(`homeassist_srv listening at http://localhost:${port}`)
})