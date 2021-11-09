import React, { useEffect } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useParams
} from "react-router-dom";

export default function Home(props: any) {




    return (<div>
        <button onClick={async () => {
            let { hostname, port, protocol } = window.location;
            let headers = new Headers();
            headers.append("Content-Type", "application/json");
            const params = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ "entity_id": "switch.ikea_outlet_1_sanna_autopistoke" })
            };
            //@ts-ignore
            const request = new Request(`/api/ha/services/switch/turn_on`, params);
            const response = await fetch(request);
            console.log(response.body)

        }}>TURN ON</button>
        <button onClick={async () => {
            let { hostname, port, protocol } = window.location;
            let headers = new Headers();
            headers.append("Content-Type", "application/json");
            const params = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ "entity_id": "switch.ikea_outlet_1_sanna_autopistoke" })
            };
            //@ts-ignore
            const request = new Request(`/api/ha/services/switch/turn_off`, params);
            const response = await fetch(request);
            console.log(response.body)

        }}>TURN OFF</button>
        <input type="time" onChange={(ev) => {
            console.log(ev.target.value)
        }}></input>

    </div>)
}