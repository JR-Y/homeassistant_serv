import React, { useContext, useState } from "react";
import { Socket } from "socket.io-client";
import { SocketContext } from "../context/socket";
import { IcalData, SettingsObject, State, StateCarHeaterEvent } from "../types";


export default function CarHeaterEvents(props: { settings: SettingsObject, states: State[], icalData: IcalData[] }) {
    const [editTags, setEditTags] = useState<string[]>([]);
    const [editNames, setEditNames] = useState<string[]>([]);
    const [carHeaterEvent, setCarHeaterEvent] = useState<StateCarHeaterEvent>({ name: "", ical_uuid: "", device_uuid: "", tags: [] });
    const socket: Socket = useContext(SocketContext);

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
                        <th scope="col">Name</th>
                        <th scope="col">Travel time</th>
                        <th scope="col">Tags</th>
                        <th scope="col">Device</th>
                        <th scope="col">Caledar</th>
                    </tr>
                </thead>
                <tbody>
                    <tr key={"gdfgdfg"}>
                        <td><input style={{ width: "100%" }} value={carHeaterEvent.name || ""} onChange={(event) => setCarHeaterEvent({ ...carHeaterEvent, name: event.target.value })}></input></td>
                        <td><input type="time" value={carHeaterEvent.startBeforeTime} min="00:10" max="5:00" onChange={e => {
                            setCarHeaterEvent({ ...carHeaterEvent, startBeforeTime: e.target.value })
                        }}></input></td>
                        <td>
                            <div style={{ maxHeight: "200px", width: "100%", overflow: "auto", cursor: "pointer" }}>
                                {getTagSuggestions(carHeaterEvent.ical_uuid).map((tag, i) => {
                                    return (<div key={i} style={{ width: "100%", backgroundColor: carHeaterEvent.tags.includes(tag) ? "lightgray" : undefined }} onClick={() => {
                                        if (carHeaterEvent.tags.includes(tag)) {
                                            setCarHeaterEvent({ ...carHeaterEvent, tags: carHeaterEvent.tags.filter(t => t != tag) })
                                        } else {
                                            setCarHeaterEvent({ ...carHeaterEvent, tags: [...carHeaterEvent.tags, tag] })
                                        }
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
                            <td><div style={{ width: "100%", cursor: "pointer" }}
                                onClick={() => { setEditNames([...editNames, item.uuid]) }}
                                onMouseLeave={() => setEditNames(editNames.filter(t => t !== item.uuid))}>
                                {editNames.includes(item.uuid) && <input style={{ width: "100%" }} value={item.name || ""} onChange={(e) => {
                                    socket.emit('update_carHeaterEvent', { uuid: item.uuid, name: e.target.value }, (resp: any) => {
                                        console.log(resp)
                                    })
                                }}></input>}
                                {!editNames.includes(item.uuid) && item.name}
                            </div></td>
                            <td><input type="time" value={item.startBeforeTime} min="00:10" max="5:00" onChange={e => {
                                socket.emit('update_carHeaterEvent', { uuid: item.uuid, startBeforeTime: e.target.value }, (resp: any) => {
                                    console.log(resp)
                                })
                            }}></input></td>
                            <td>
                                <div style={{ maxHeight: "200px", width: "100%", overflow: "auto", cursor: "pointer" }}
                                    onClick={() => { setEditTags([...editTags, item.uuid]) }}
                                    onMouseLeave={() => setEditTags(editTags.filter(t => t !== item.uuid))}>
                                    {editTags.includes(item.uuid) && getTagSuggestions(item.ical_uuid).map((tag, i) => {
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
                                    {!editTags.includes(item.uuid) && item.tags?.map((tag, i) => <div key={i}>{tag}</div>)}
                                </div>
                            </td>
                            {/**<td>{item.tags?.map((tag, i) => <div key={i}>{tag}</div>)}</td> */}
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
    </div>)
}