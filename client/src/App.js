import { useState, useEffect} from 'react';
import logo from './logo.svg';
import './App.css';
import { CameraWebRTC } from './components/Camera/Camera';




function App() {

  return (
    <div className="App">
     <CameraWebRTC/>
    </div>
  );
}

export default App;
