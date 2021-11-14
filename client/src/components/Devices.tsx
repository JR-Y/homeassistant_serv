import React, { useContext, useState } from "react";
import { Socket } from "socket.io-client";
import { SocketContext } from "../context/socket";
import { addDevice, SettingsObject, State } from "../types";

interface NameMap { [entity_id: string]: string }


export default function Devices(props: { settings: SettingsObject, states: State[] }) {
    const [names, setNames] = useState<NameMap>({});
    const socket: Socket = useContext(SocketContext);

    function handleAddDeviceClick(device: addDevice) {
        socket.emit('add_device', device, (resp: any) => {
            console.log(resp)
        })
    }

    function handleEditName(entity_id: string, name: string) {
        let newNames = { ...names };
        newNames[entity_id] = name;
        setNames(newNames);
    }

    return (<div style={{ margin: "10px" }}>
        {props.settings.devices.length > 0 ?
            <div className="card">
                <h5 className="card-header">Devices</h5>
                <table className="table table-hover">
                    <thead>
                        <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Entity_id</th>
                        </tr>
                    </thead>
                    <tbody>
                        {props.settings.devices.map((device, i) => {
                            return (<tr key={i}>
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
                            return (
                                <tr key={i}>
                                    <th scope="row" style={{ wordBreak: "break-all" }}>{state.entity_id}</th>
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