import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import FormPage from './components/FormPage';
// You can create a basic CSS file if you like
// import './App.css';

function App() {
  return (
    // BrowserRouter should wrap your entire routing setup
    <BrowserRouter>
      <div className="App"> {/* Optional: for basic styling */}
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/form" element={<FormPage />} />
          {/* Add other routes here if needed */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
