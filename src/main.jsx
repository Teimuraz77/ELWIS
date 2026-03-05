import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // oder './App.jsx' / './App.tsx' je nach deiner Datei
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
