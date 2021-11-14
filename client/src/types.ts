export interface User {
    uuid: string
    name: string
}

export interface IcalPath {
    uuid: string
    name: string
    path: string
}
export interface IcalData {
    uuid: string
    data: object
    tagSuggestions: string[]
    error?: string
}



export interface State {
    entity_id: string
    state: string
    changed: Date
    HA_StateObject: object
}

export interface Device {
    uuid: string
    name?: string
    entity_id: string
}
export interface addDevice {
    name?: string
    entity_id: string
}


export interface CarHeaterEvent {
    uuid: string
    name?: string
    tags: string[]
    ical_uuid: string
    device_uuid: string
    startBeforeTime?: string
    endAfterStartTime?: string
    upComingEvents?: upComingCarHeaterEvent[]
}

export interface upComingCarHeaterEvent {
    name: string
    eventStart: Date
    heatingStart: Date
    heatingEnd: Date
}
export interface StateCarHeaterEvent {
    name?: string
    tags: string[]
    ical_uuid: string
    device_uuid: string
    startBeforeTime?: string
    endAfterStartTime?: string
}
export interface addCarHeaterEvent {
    name?: string
    tags?: string[]
    ical_uuid: string
    device_uuid: string
    startBeforeTime?: string
    endAfterStartTime?: string
}
export interface updateCarHeaterEvent {
    uuid: string
    name?: string
    tags?: string[]
    ical_uuid?: string
    device_uuid?: string
    startBeforeTime?: string
    endAfterStartTime?: string
}


export interface SettingsObject {
    users: User[]
    icalPaths: IcalPath[]
    devices: Device[]
    carHeaterEvents: CarHeaterEvent[]
}

export interface HaSendMessage {
    id?: number//Mandatory, optional due to ts logic
    type: "get_states" | "call_service" | "unsubscribe_events" | "auth" | "get_config" | "get_services" | "get_panels" | "camera_thumbnail" | "media_player_thumbnail" | "ping"
}

export interface HaResultMessage {
    id: number
    type: "result"
    success: boolean
    result: object
}

export interface HaEventMessage {
    id: number
    type: "event"
    event: {
        data: object
        event_type: "state_changed" | string
        time_fired: Date
        origin: string
    }
}