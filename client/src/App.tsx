import React, { useContext, useEffect, useState } from 'react'
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link
} from "react-router-dom";
import logo from './logo.svg';
import './App.css';
import Settings from './components/Settings';
import Users from './components/Users';
import Home from './components/Home';
import Devices from './components/Devices'
import Calendars from './components/Calendars'
import CarHeaterEvents from './components/CarHeaterEvents'
import axios from 'axios';
import { Socket } from "socket.io-client";
import { SocketContext, socket } from './context/socket';
import { SettingsObject, State } from './types'

export default function App() {
  const [settings, setSettings] = useState<SettingsObject>({ users: [], icalPaths: [], devices: [], carHeaterEvents: [] });
  const [states, setStates] = useState([]);
  const [icalData, setIcalData] = useState([]);
  //const socketC = useContext(SocketContext);

  useEffect(() => {
    console.log("run");
    socket.on("connect", () => {
      console.log(socket.id); // x8WIv7-mJelg7on_ALbx
    });

    socket.on("settings", (data: SettingsObject) => {
      setSettings(data)
      console.log(`SETTINGS: ${data}`)
    })
    socket.on("states", (data) => {
      setStates(data)
      console.log(`STATES: ${data}`)
    })
    socket.on("icalData", (data) => {
      setIcalData(data)
      console.log(`icalData: ${data}`)
    })
    return () => {
      socket.removeAllListeners();
    }
  }, [])
  return (
    <SocketContext.Provider value={socket}>
      <div className="App">
        <Router>
          <div style={{}}>
            <Link style={{
              width: "100%",
              textAlign: `center`,
              display: `table`,
              boxShadow: "5,5",
              textDecoration: "none",
              color: "white",
              backgroundColor: "black"
            }} to="/">
              <div style={{
                width: `100%`, padding: "15px",
                display: `table-cell`, verticalAlign: `middle`,
                opacity: "100%", pointerEvents: `none`
              }}>
                <i className="fas fa-home fa-3x"></i>
              </div>
            </Link>
            {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/carheaterevents" element={<CarHeaterEvents settings={settings} states={states} icalData={icalData} />} />
              <Route path="/calendars" element={<Calendars settings={settings} states={states} icalData={icalData} />} />
              <Route path="/devices" element={<Devices settings={settings} states={states} />} />
              <Route path="/settings" element={<Settings settings={settings} states={states} icalData={icalData} />} />
              <Route path="/users" element={<Users settings={settings} />} />
            </Routes>
          </div>
        </Router>
      </div>
    </SocketContext.Provider>
  );
}
