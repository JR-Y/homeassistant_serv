import { MongoClient } from 'mongodb'

const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

const dbName = 'HOMEASSISTANT_API_SERVER';
export const db = client.db(dbName);
export let users = db.collection('users');
export let icalPaths = db.collection('icalPaths');
export let devices = db.collection('devices');
export let carHeaterEvents = db.collection('carHeaterEvents');

export let states = db.collection('states');
export let icalData = db.collection('icalData');
export let connected = false;

export async function getIcalData() {
    if (connected) {
        return await icalData.find({}).toArray();
    } else {
        return [];
    }
}

export async function saveIcalData(object) {
    if (connected) {
        return await icalData.insertOne(object);
    } else {
        return [];
    }
}

export async function connect() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    users = db.collection('users');
    icalPaths = db.collection('icalPaths');
    devices = db.collection('devices');
    carHeaterEvents = db.collection('carHeaterEvents');

    states = db.collection('states');
    icalData = db.collection('icalData');

    // the following code examples can be pasted here...
    connected = true;
    return 'done.';
}

connect()
    .then(console.log)
    .catch(console.error);