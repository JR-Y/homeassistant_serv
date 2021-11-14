import React, { useContext, useState } from "react";
import { Socket } from "socket.io-client";
import { SocketContext } from "../context/socket";
import { IcalData, SettingsObject, State } from "../types";

export default function Calendars(props: { isMobile: boolean, settings: SettingsObject, states: State[], icalData: IcalData[] }) {
    const [calendar, setCalendar] = useState({ name: "", path: "" });
    const socket: Socket = useContext(SocketContext);

    function handleAddCalendarClick() {
        if (calendar.name && calendar.path) {
            socket.emit('add_calendar', calendar, (resp: any) => {
                console.log(resp)
                setCalendar({ name: "", path: "" });
            })
        } else {
            window.alert("Add name & path!")
        }
    }

    return (<div style={{ margin: "10px" }}>
        <div className="card">
            <h5 className="card-header">Calendars</h5>
            <table className="table table-hover">
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">uri</th>
                    </tr>
                </thead>
                <tbody>
                    <tr key={"gdfgdfg"}>
                        <td><input style={{ width: "100%" }} value={calendar.name || ""} onChange={(event) => setCalendar({ name: event.target.value, path: calendar.path })}></input></td>
                        <td><input style={{ width: "100%" }} value={calendar.path || ""} onChange={(event) => setCalendar({ name: calendar.name, path: event.target.value })}></input></td>
                        <td><button onClick={() => handleAddCalendarClick()}>Add Calendar</button></td>
                    </tr>
                    {props.settings.icalPaths.map((cal, i) => {
                        let data = props.icalData.find(c => c.uuid === cal.uuid);
                        return (<tr key={i}>
                            <td>{cal.name}</td>
                            <td style={{ wordBreak: "break-all", color: data?.error ? "red" : undefined }}>
                                {!data?.error ?
                                    <i style={{ color: "green" }} className="fas fa-check" /> :
                                    <i style={{ color: "red" }} className="fas fa-times" />}
                                {data?.error ? ` ${data.error} ${cal.path}` : ` ${cal.path}`}
                            </td>
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
    </div>)
}