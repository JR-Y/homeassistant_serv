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
import axios from 'axios';
import { Socket } from "socket.io-client";
import { SocketContext, socket } from './context/socket';

export default function App() {
  const [settings, setSettings] = useState({});
  //const socketC = useContext(SocketContext);

  useEffect(() => {
    console.log("run");
    socket.on("connect", () => {
      console.log(socket.id); // x8WIv7-mJelg7on_ALbx
    });

    socket.on("settings", (data: any) => {
      setSettings(data)
      console.log(data)
    })
    return () => {
      socket.removeAllListeners();
    }
  }, [])
  return (
    <SocketContext.Provider value={socket}>
      <div className="App">
        <Router>
          <div>
            <nav>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/settings">Settings</Link>
                </li>
                <li>
                  <Link to="/users">Users</Link>
                </li>
              </ul>
            </nav>

            {/* A <Switch> looks through its children <Route>s and
            renders the first one that matches the current URL. */}
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/users" element={<Users />} />
            </Routes>
          </div>
        </Router>
      </div>
    </SocketContext.Provider>
  );
}
