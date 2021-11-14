import React
    //, { useContext, useEffect } 
    from "react";
import {
    //rowserRouter as Router,
    //Routes,
    //Route,
    Link,
    //useParams
} from "react-router-dom";
//import { Socket } from "socket.io-client";
//import { SocketContext } from "../context/socket";

export default function Home(props: any) {
    //const socket: Socket = useContext(SocketContext);

    function renderLink(path: string, text: string) {
        return (
            <Link
                style={{
                    width: "100%",
                    padding: "4px",
                    height: `200px`,
                    textAlign: `center`,
                    margin: `0px`,
                    display: `table`,
                    boxShadow: "0 1px 3px 0 #d4d4d5,0 0 0 1px #d4d4d5",
                    textDecoration: "none",
                    color: "black",
                    fontWeight: "bold",
                    backgroundColor: "white",
                    borderRadius: "0.28571429rem",
                    fontSize: "25px"
                }}
                to={path}
                onMouseOver={(e) => {
                    //@ts-ignore
                    e.target.style.background = "hsl(0, 0%, 80%)"
                }}
                onMouseLeave={(e) => {
                    //@ts-ignore
                    e.target.style.background = "white"
                }}>
                <div style={{
                    width: `100%`, height: `100%`,
                    display: `table-cell`, verticalAlign: `middle`,
                    opacity: "100%", pointerEvents: `none`
                }}>
                    {text}
                </div>
            </Link>
        )

    }

    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(300px,1fr))`,
            gridGap: `20px`,
            padding: `15px`,
            justifyItems: `center`,
            alignItems: `center`,
            //backgroundColor: "hsl(0, 0%, 95%)"
        }}>
            {renderLink("/carheaterevents", "Car heater events")}
            {renderLink("/calendars", "Calendars")}
            {renderLink("/devices", "Devices")}
            {/*renderLink("/settings", "Settings")*/}
            {/*renderLink("/users", "Users")*/}
        </div>
    )
}