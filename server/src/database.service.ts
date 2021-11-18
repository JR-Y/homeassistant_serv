import { Schema, model, connect } from 'mongoose';
import * as path from 'path';
import { IcalData, State } from './types';
const MONGO_URL = 'mongodb://localhost:27017';
const MONGO_DB = 'HOMEASSISTANT_API_SERVER';
export let connected = false;

const icalDataSchema = new Schema<IcalData>({
    data: { type: Object, required: true },
    tagSuggestions: [{ type: String }],
    error: { type: String }
});
export const icalDataModel = model<IcalData>('icalData', icalDataSchema);

const stateSchema = new Schema<State>({
    entity_id: { type: String, required: true },
    state: { type: String },
    changed: { type: Date },
    HA_StateObject: { type: Object }
});
export const stateModel = model<State>('states', stateSchema);




connect(path.join(MONGO_URL, MONGO_DB))
    .then(res => {
        connected = true
    })
    .catch(err => console.log(err));