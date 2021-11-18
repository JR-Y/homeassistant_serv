require('dotenv').config();
import fs from 'fs';
import express from "express";
const app = express()
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io: Socket = new Server(server);
const bodyParser = require('body-parser')
import * as path from 'path';
const axios = require('axios').default;
import ical from 'ical';
const WebSocketClient = require('websocket').client;
import { addCarHeaterEvent, addDevice, addIcalPath, IcalData, SettingsObject, updateCarHeaterEvent } from './types'
import { Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { connected, icalDataModel, stateModel } from './database.service';

//Load file containing user inputs & selections
const SETTINGS_FILE_PATH = process.env.SETTINGS_FILE_PATH;
const DATA_FOLDER_PATH = process.env.DATA_FOLDER_PATH;
const ICALDATA_FILE_PATH = path.join(DATA_FOLDER_PATH, "icaldata.json");
const CLIENT_BUILD_PATH = path.join(__dirname, '..', '..', 'client/build');

let settings: SettingsObject;
let states = [];
let icalData: IcalData[] = [];
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

function getOutdoorTemperature() {
    const tempState = states.find(s => s.entity_id === HA_SENSOR_OUTDOOR_TEMPERATURE);
    let outdoorTemperature
    try {
        outdoorTemperature = Number.parseFloat(tempState.state);
        if (outdoorTemperature > -50 && outdoorTemperature < 60) {
            return outdoorTemperature;
        }
    } catch (error) {
        console.log(error)
    }
    return undefined
}

function getIndoorTemperature() {
    const tempState = states.find(s => s.entity_id === HA_SENSOR_INDOOR_TEMPERATURE);
    let indoorTemperature
    try {
        indoorTemperature = Number.parseFloat(tempState.state);
        if (indoorTemperature > -50 && indoorTemperature < 60) {
            return indoorTemperature;
        }
    } catch (error) {
        console.log(error)
    }
    return undefined
}

function getTemperatureAdjustedCarHeatingTime() {
    const outdoorTemperature = getOutdoorTemperature();
    if (!outdoorTemperature) { return 0 }
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
        updateIcalData()
        saveSettings()
    })
    socket.on('delete_calendar', (uuid: string) => {
        settings.icalPaths = settings.icalPaths.filter((item) => item.uuid !== uuid);
        saveSettings()
    })
    socket.on('add_carHeaterEvent', (data: addCarHeaterEvent) => {
        let id = uuidv4();
        settings.carHeaterEvents.push({ uuid: id, ...data });
        saveSettings()
    })
    socket.on('update_carHeaterEvent', (data: updateCarHeaterEvent) => {
        const i = settings.carHeaterEvents.findIndex(c => c.uuid == data.uuid);
        if (i > -1) {
            settings.carHeaterEvents[i] = { ...settings.carHeaterEvents[i], ...data }
        }
        saveSettings()
    })
    socket.on('delete_carHeaterEvent', (uuid: string) => {
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

function getMillisecondsFromTime(time: string): number {
    try {
        const valid = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(time);
        if (valid) {
            const [h, m] = time.split(":");
            const hour = 60 * 60 * 1000;
            const minute = 60 * 1000;
            return (Number.parseInt(h) * hour) + (Number.parseInt(m) * minute);
        }
    } catch (error) {
        console.log(error)
        return 0
    }

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
            const data = ical.parseICS(res.data);
            const i = icalData.findIndex(val => val.uuid === element.uuid);
            if (i < 0) {
                icalData.push({ uuid: element.uuid, data: data, tagSuggestions: generateTagSuggestions(data) })
            } else {
                icalData[i] = { uuid: element.uuid, data: data, tagSuggestions: generateTagSuggestions(data) };
            }
            saveIcalData();
        }).catch(err => {
            console.log(err)
            const i = icalData.findIndex(val => val.uuid === element.uuid);
            if (i < 0) {
                icalData.push({ uuid: element.uuid, data: {}, error: "unable to get calendar", tagSuggestions: [] })
            } else {
                icalData[i] = { uuid: element.uuid, data: {}, error: "unable to get calendar", tagSuggestions: [] };
            }
        })
    }
}
updateIcalData();
setInterval(updateIcalData, 1000 * 60 * 10);

function generateTagSuggestions(data) {
    let suggestions = [];
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const ev = data[key];
            const { summary } = ev;
            if (summary && typeof summary === 'string') {
                const words = summary.toLowerCase().split(' ');
                words.forEach(word => {
                    if (!suggestions.includes(word)) {
                        suggestions.push(word)
                    }
                })
            }
        }
    }
    return suggestions;
}

function getTags(summary): string[] {
    if (summary && typeof summary === 'string') {
        return summary.toLowerCase().split(' ');
    }
    return []
}

//setInterval(handleIcalEvents, 1000 * 60);
function handleCarHeaterEvents() {
    const { icalPaths, carHeaterEvents } = settings;
    carHeaterEvents.forEach((carHeaterEvent, heaterEventIndex) => {
        const { startBeforeTime, endAfterStartTime, ical_uuid, tags, device_uuid } = carHeaterEvent;
        const startBeforeMS = startBeforeTime ? getMillisecondsFromTime(startBeforeTime) : 0;
        const endAfterStartMS = endAfterStartTime ? getMillisecondsFromTime(endAfterStartTime) : 5 * 60 * 1000; //Default end 5 minutes after scheduled start time
        const temperatureAddedTime = getTemperatureAdjustedCarHeatingTime();
        const defaultHeatingTime = 30 * 60 * 1000;//30 min
        const totalHeatingStartBeforeTime: number = startBeforeMS + defaultHeatingTime + temperatureAddedTime;
        if (ical_uuid) {
            let ical = icalData.find(v => v.uuid == ical_uuid);
            if (ical) {
                const { data } = ical;
                const dt = new Date();
                let upComingEvents = [];
                for (const key in data) {
                    if (Object.prototype.hasOwnProperty.call(data, key)) {
                        const ev = data[key];
                        if (ev.type && ev.type === "VEVENT") {
                            const eventStart = ev.start ? new Date(ev.start) : undefined
                            const eventEnd = ev.end ? new Date(ev.end) : undefined

                            const event_tags = getTags(ev.summary);
                            if (tags && event_tags.length > 0 && event_tags.find(t => tags.includes(t))) {
                                if (dt.getTime() > eventStart.getTime() - (1000 * 60 * 60 * 24) && eventEnd.getTime() > dt.getTime()) {
                                    //console.log(`Heatingevent starting in ${ev.start.getTime() - totalHeatingStartBeforeTime - dt.getTime()}`)
                                    const currentTime = dt.getTime();
                                    const startTime = eventStart.getTime() - totalHeatingStartBeforeTime;
                                    const endTime = eventStart.getTime() - startBeforeMS + endAfterStartMS;
                                    upComingEvents.push({
                                        name: ev.summary,
                                        eventStart: ev.start,
                                        heatingStart: new Date(startTime),
                                        heatingEnd: new Date(endTime)
                                    })
                                    if (currentTime > startTime && currentTime < endTime) {
                                        //Heating should be running
                                        console.log("heating should be running")
                                        const device = settings.devices.find(d => d.uuid === device_uuid);
                                        if (device) {
                                            const state = states.find(state => state.entity_id === device.entity_id);
                                            if (state && state.state && state.state !== "on") {
                                                operateSwitch("turn_on", device.entity_id);
                                            }
                                        }
                                    } else {
                                        console.log("heating should be stopped")
                                        const device = settings.devices.find(d => d.uuid === device_uuid);
                                        if (device) {
                                            const state = states.find(state => state.entity_id === device.entity_id);
                                            if (state && state.state && state.state !== "off") {
                                                operateSwitch("turn_off", device.entity_id);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                settings.carHeaterEvents[heaterEventIndex]["upComingEvents"] = upComingEvents;
            }
        }
    })
    saveSettings()
}
setTimeout(handleCarHeaterEvents, 10000)
setInterval(handleCarHeaterEvents, 1000 * 60);

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

app.use(express.static(CLIENT_BUILD_PATH))
app.use(bodyParser.json())

app.get('/api/temperature/outdoor', (req, res) => {

})
app.get('/api/clear_states', (req, res) => {
    states = [];
    saveSettings()
    res.send(`ok`);
})

//Example
app.get('/api/temperature/indoor', (req, res) => {
    axios.get(`${HA_ROOT_URL}/api/states/${HA_SENSOR_INDOOR_TEMPERATURE}`,
        {
            headers: {
                "Authorization": `Bearer ${HA_TOKEN}`
            }
        }
    ).then(result => {
        let temp;
        if (result.data && result.data.state) {
            try {
                temp = Number.parseFloat(result.data.state)
            } catch (error) {
                console.log(error)
            }
        }
        res.send(temp)
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

app.use('/*', (req, res) => {
    res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
});


server.listen(port, () => {
    console.log(`homeassist_srv listening at http://localhost:${port}`)
})