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
import { addCarHeaterEvent, addDevice, addIcalPath, Device, SettingsObject } from './types'
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

//Load file containing user inputs & selections
const SETTINGS_FILE_PATH = process.env.SETTINGS_FILE_PATH;
const DATA_FOLDER_PATH = process.env.DATA_FOLDER_PATH;
const ICALDATA_FILE_PATH = path.join(DATA_FOLDER_PATH, "icaldata.json");

let settings: SettingsObject;
let states = [];
let icalData = {};
if (!fs.existsSync(SETTINGS_FILE_PATH)) {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify({
        users: [],
        icalPaths: [],
        devices: [],
        carHeaterEvents: []
    }))
} else {
    //@ts-ignore
    settings = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH))
    if (!settings.users) { settings.users = [] }
    if (!settings.carHeaterEvents) { settings.carHeaterEvents = [] }
}
function saveSettings() {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings));
    emitSettings()
}

if (!fs.existsSync(ICALDATA_FILE_PATH)) {
    fs.writeFileSync(ICALDATA_FILE_PATH, JSON.stringify({}))
} else {
    //@ts-ignore
    icalData = JSON.parse(fs.readFileSync(ICALDATA_FILE_PATH))
}
function saveIcalData() {
    fs.writeFileSync(ICALDATA_FILE_PATH, JSON.stringify(icalData));
    emitIcalData();
}
const port = process.env.PORT;
const HA_ROOT_URL = `http://${process.env.HA_HOST}:${process.env.HA_PORT}`;
const HA_TOKEN = process.env.HA_TOKEN;
let HA_SENSOR_OUTDOOR_TEMPERATURE = process.env.HA_SENSOR_OUTDOOR_TEMPERATURE;
let HA_SENSOR_INDOOR_TEMPERATURE = process.env.HA_SENSOR_INDOOR_TEMPERATURE;

let OUTDOOR_TEMPERATURE;


function getOutdoorTemperature() {
    if (OUTDOOR_TEMPERATURE) {
        if (OUTDOOR_TEMPERATURE > -50 && OUTDOOR_TEMPERATURE < 60) {
            return OUTDOOR_TEMPERATURE;
        }
    }
    return 0
}

function getTemperatureAdjustedCarHeatingTime() {
    const outdoorTemperature = getOutdoorTemperature();
    const fullAdditionalTime = 30 * 60 * 1000;// 30 min max additional time in milliseconds
    switch (true) {
        case outdoorTemperature < -15:
            return fullAdditionalTime
            break;
        case outdoorTemperature < 0 && outdoorTemperature >= -15:
            return Math.abs(outdoorTemperature) * fullAdditionalTime / 15
            break;
        default:
            return 0
            break;
    }
}

io.on("connection", (socket: Socket) => {
    console.log(`Connected: ${socket}`)
    socket.emit("settings", settings);
    socket.emit("states", states);
    socket.emit("icalData", icalData);
    socket.on('add_device', (data: addDevice) => {
        let id = uuidv4();
        settings.devices.push({ uuid: id, ...data });
        saveSettings()
    })
    socket.on('add_calendar', (data: addIcalPath) => {
        let id = uuidv4();
        settings.icalPaths.push({ uuid: id, ...data });
        saveSettings()
    })
    socket.on('delete_calendar', (uuid: string) => {
        settings.icalPaths = settings.icalPaths.filter((item) => item.uuid !== uuid);
        saveSettings()
    })
    socket.on('add_calendar', (data: addIcalPath) => {
        let id = uuidv4();
        settings.icalPaths.push({ uuid: id, ...data });
        saveSettings()
    })
    socket.on('add_carHeaterHevent', (data: addCarHeaterEvent) => {
        let id = uuidv4();
        settings.carHeaterEvents.push({ uuid: id, ...data });
        saveSettings()
    })
    socket.on('delete_carHeaterHevent', (uuid: string) => {
        settings.carHeaterEvents = settings.carHeaterEvents.filter((item) => item.uuid !== uuid);
        saveSettings()
    })
});
function emitStates() {
    io.emit("states", states);
}
function emitSettings() {
    io.emit("settings", settings);
}
function emitIcalData() {
    io.emit("icalData", icalData);
}



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


function updateIcalData() {
    const { icalPaths } = settings;
    for (let index = 0; index < icalPaths.length; index++) {
        const element = icalPaths[index];
        axios.get(element.path).then(res => {
            icalData[element.uuid] = ical.parseICS(res.data);
            saveIcalData();
        }).catch(err => {
            console.log(err)
        })
    }
}
updateIcalData();
setInterval(updateIcalData, 1000 * 60 * 10);

function handleIcalEvents() {
    const { icalPaths } = settings;
    icalPaths.forEach((icalPath, i) => {
        const { uuid, name, path } = icalPath;
        if (icalData[uuid]) {
            const dt = new Date();
            for (const key in icalData[uuid]) {
                if (Object.prototype.hasOwnProperty.call(icalData[uuid], key)) {
                    const ev = icalData[uuid][key];
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
                        if (json.event.event_type === "state_changed" && json.event.data && json.event.data.entity_id) {
                            const { entity_id, new_state } = json.event.data;
                            if (entity_id) {
                                const i = states.findIndex((val) => val.entity_id === entity_id);
                                if (i >= 0) {
                                    console.log(`Updated state: ${new_state}`)
                                    states[i] = new_state
                                } else {
                                    console.log(`Added to states: ${new_state}`)
                                    states.push(new_state)
                                }
                                emitStates();
                            } else {
                                console.log(json)
                            }

                        } else {
                            console.log(json)
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

function saveStates(newStates) {
    if (newStates && Array.isArray(newStates)) {
        newStates.forEach(s => {
            const { entity_id } = s;
            const i = states.findIndex((val) => val.entity_id === entity_id);
            if (i >= 0) {
                states[i] = s
            } else {
                states.push(s)
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
    states = [];
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
app.post('/api/addDevice', (req, res) => {
    console.log(req.body)

    res.json({ status: "added" });
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