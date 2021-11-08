export interface User {
    name: string
}

export interface IcalData {
    name?: string
    path: string
    data?: object
}

export interface State {
    name?: string
    entity_id: string
    state: string
    changed: Date
    HA_StateObject: object
}

export interface CarHeaterEvent {
    name: string
    tag: string
    state: State
    startBeforeMS: number
    endAfterStartMS: number
}


export interface SettingsObject {
    users: User[]
    icalData: IcalData[]
    states: State[]
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