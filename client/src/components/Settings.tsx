import React, { useContext, useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useParams
} from "react-router-dom";
import { Socket } from "socket.io-client";
import { SocketContext } from "../context/socket";
import { addDevice, CarHeaterEvent, IcalData, SettingsObject, State, StateCarHeaterEvent } from "../types";

interface NameMap { [entity_id: string]: string }


export default function Settings(props: { settings: SettingsObject, states: State[], icalData: IcalData[] }) {
    const [names, setNames] = useState<NameMap>({});
    const [calendar, setCalendar] = useState({ name: "", path: "" });
    const [carHeaterEvent, setCarHeaterEvent] = useState<StateCarHeaterEvent>({ name: "", ical_uuid: "", device_uuid: "", tags: [] });
    const socket: Socket = useContext(SocketContext);

    function handleAddDeviceClick(device: addDevice) {
        socket.emit('add_device', device, (resp: any) => {
            console.log(resp)
        })
    }

    function handleAddCalendarClick() {
        socket.emit('add_calendar', calendar, (resp: any) => {
            console.log(resp)
        })
    }

    function handleEditName(entity_id: string, name: string) {
        let newNames = { ...names };
        newNames[entity_id] = name;
        setNames(newNames);
    }

    function handleAddCarHeaterLinkClick() {
        socket.emit('add_carHeaterEvent', carHeaterEvent, (resp: any) => {
            console.log(resp)
        })
    }

    function getTagSuggestions(ical_uuid: string): string[] {
        if (props.icalData) {
            const i = props.icalData.findIndex(val => val.uuid === ical_uuid);
            if (i > -1) {
                return props.icalData[i].tagSuggestions;
            }

        }
        return [];
    }

    return (<div style={{ margin: "10px" }}>
        <div className="card">
            <h5 className="card-header">Car heater events</h5>
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">uuid</th>
                        <th scope="col">Name</th>
                        <th scope="col">Travel time</th>
                        <th scope="col">Tags</th>
                        <th scope="col">Device</th>
                        <th scope="col">Caledar</th>
                    </tr>
                </thead>
                <tbody>
                    <tr key={"gdfgdfg"}>
                        <th scope="row"></th>
                        <td><input style={{ width: "100%" }} value={carHeaterEvent.name || ""} onChange={(event) => setCarHeaterEvent({ ...carHeaterEvent, name: event.target.value })}></input></td>
                        <td>
                            <div style={{ maxHeight: "200px", width: "100%", overflow: "auto", cursor: "pointer" }}>
                                {getTagSuggestions(carHeaterEvent.ical_uuid).map((tag, i) => {
                                    return (<div key={i} style={{ width: "100%", backgroundColor: carHeaterEvent.tags.includes(tag) ? "lightgray" : undefined }} onClick={() => {
                                        let tags: string[] = carHeaterEvent.tags;
                                        if (carHeaterEvent.tags.includes(tag)) {
                                            tags = carHeaterEvent.tags.filter(t => t != tag)
                                        } else {
                                            tags.push(tag);
                                        }
                                        setCarHeaterEvent({ ...carHeaterEvent, tags: tags })
                                    }}>{tag}</div>)
                                })}
                            </div>
                        </td>
                        <td>
                            <select value={carHeaterEvent.device_uuid} className="form-select" aria-label="Default select" onChange={(e) => setCarHeaterEvent({ ...carHeaterEvent, device_uuid: e.target.value })}>
                                <option key={"i"} value={""}></option>
                                {props.settings.devices.map((device, i) => {
                                    return (<option key={i} value={device.uuid}>{device.name}</option>
                                    )
                                })}
                            </select>
                        </td>
                        <td>
                            <select value={carHeaterEvent.ical_uuid} className="form-select" aria-label="Default select" onChange={(e) => setCarHeaterEvent({ ...carHeaterEvent, ical_uuid: e.target.value })}>
                                <option key={"i"} value={""}></option>
                                {props.settings.icalPaths.map((cal, i) => {
                                    return (<option key={i} value={cal.uuid}>{cal.name}</option>
                                    )
                                })}
                            </select>
                        </td>
                        <td><button onClick={() => handleAddCarHeaterLinkClick()}>Add heater event</button></td>
                    </tr>
                    {props.settings.carHeaterEvents.map((item, i) => {
                        return (<tr key={i}>
                            <th scope="row">{item.uuid}</th>
                            <td><input style={{ width: "100%" }} value={carHeaterEvent.name || ""} onChange={(e) => {
                                socket.emit('update_carHeaterEvent', { uuid: item.uuid, name: e.target.value }, (resp: any) => {
                                    console.log(resp)
                                })
                            }}></input></td>
                            <td><input type="time" value={item.startBeforeTime} min="00:10" max="5:00" onChange={e => {
                                socket.emit('update_carHeaterEvent', { uuid: item.uuid, startBeforeTime: e.target.value }, (resp: any) => {
                                    console.log(resp)
                                })
                            }}></input></td>
                            <td>
                                <div style={{ maxHeight: "200px", width: "100%", overflow: "auto", cursor: "pointer" }}>
                                    {getTagSuggestions(item.ical_uuid).map((tag, i) => {
                                        return (<div key={i} style={{ width: "100%", backgroundColor: item.tags?.includes(tag) ? "lightgray" : undefined }} onClick={() => {
                                            let tags: string[] = item.tags || [];
                                            if (item.tags?.includes(tag)) {
                                                tags = item.tags?.filter(t => t != tag)
                                            } else {
                                                tags.push(tag);
                                            }
                                            socket.emit('update_carHeaterEvent', { uuid: item.uuid, tags: tags }, (resp: any) => {
                                                console.log(resp)
                                            })
                                        }}>{tag}</div>)
                                    })}
                                </div>
                            </td>
                            <td>{item.tags?.map((tag, i) => <div key={i}>{tag}</div>)}</td>
                            <td>{item.ical_uuid}</td>
                            <td>{item.device_uuid}</td>
                            <td><button onClick={() => {
                                socket.emit('delete_carHeaterEvent', item.uuid, (resp: any) => {
                                    console.log(resp)
                                })
                            }}>Delete event</button></td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        <div className="card">
            <h5 className="card-header">Calendars</h5>
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">uuid</th>
                        <th scope="col">Name</th>
                        <th scope="col">uri</th>
                    </tr>
                </thead>
                <tbody>
                    <tr key={"gdfgdfg"}>
                        <th scope="row"></th>
                        <td><input style={{ width: "100%" }} value={calendar.name || ""} onChange={(event) => setCalendar({ name: event.target.value, path: calendar.path })}></input></td>
                        <td><input style={{ width: "100%" }} value={calendar.path || ""} onChange={(event) => setCalendar({ name: calendar.name, path: event.target.value })}></input></td>
                        <td><button onClick={() => handleAddCalendarClick()}>Add Calendar</button></td>
                    </tr>
                    {props.settings.icalPaths.map((cal, i) => {
                        return (<tr key={i}>
                            <th scope="row">{cal.uuid}</th>
                            <td>{cal.name}</td>
                            <td>{cal.path}</td>
                            <td><button onClick={() => {
                                socket.emit('delete_calendar', cal.uuid, (resp: any) => {
                                    console.log(resp)
                                })
                            }}>Delete calendar</button></td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
        {props.settings.devices.length > 0 ?
            <div className="card">
                <h5 className="card-header">Devices</h5>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th scope="col">uuid</th>
                            <th scope="col">Name</th>
                            <th scope="col">Entity_id</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.settings.devices.map((device, i) => {
                            return (<tr key={i}>
                                <th scope="row">{device.uuid}</th>
                                <td>{device.name}</td>
                                <td>{device.entity_id}</td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div> : null}

        {props.states.length > 0 ?
            <div className="card">
                <h5 className="card-header">States</h5>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th scope="col">Entity_id</th>
                            <th scope="col">State</th>
                            <th scope="col">Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.states.map((state, i) => {
                            return (<tr key={i}>
                                <th scope="row">{state.entity_id}</th>
                                <td>{state.state}</td>
                                <td><input value={names[state.entity_id] || ""} onChange={(event) => handleEditName(state.entity_id, event.target.value)}></input></td>
                                <td><button onClick={() => handleAddDeviceClick({ entity_id: state.entity_id, name: names[state.entity_id] || "" })}>ADD DEVICE</button></td>
                            </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div> : null}
    </div>)
}