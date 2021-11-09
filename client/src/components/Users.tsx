import React, { useContext, useEffect } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useParams
} from "react-router-dom";
import { Socket } from "socket.io-client";
import { SocketContext } from "../context/socket";

export default function Users(props: any) {
    const socket: Socket = useContext(SocketContext);

    useEffect(() => {
        // socket.on("connect", () => {
        //     console.log(socket.id); // x8WIv7-mJelg7on_ALbx
        // });
        // socket.on("settings", (data: any) => {
        //     //setSettings(data)
        //     console.log(data)
        // })
        // axios.get("/api/settings").then(res => {

        // }).catch(err => console.log(err))
    })




    return (<div>

    </div>)
}