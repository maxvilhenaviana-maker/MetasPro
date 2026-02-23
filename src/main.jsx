import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Este arquivo é a ponte entre o seu código React (App.jsx) 
// e o elemento <div id="root"></div> que está no seu index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);