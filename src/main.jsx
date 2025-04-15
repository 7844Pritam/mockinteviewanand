import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react'; // Ensure this line is at the top of your file
// import ReactDOM from 'react-dom'; // Or 'react-dom/client' in React 18+

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
