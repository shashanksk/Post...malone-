// import React from 'react';
// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import LoginScreen from './components/LoginScreen';
// import FormPage from './components/FormPage';
// // You can create a basic CSS file if you like
// // import './App.css';

// function App() {
//   return (
//     // BrowserRouter should wrap your entire routing setup
//     <BrowserRouter>
//       <div className="App"> {/* Optional: for basic styling */}
//         <Routes>
//           <Route path="/" element={<LoginScreen />} />
//           <Route path="/form" element={<FormPage />} />
//           {/* Add other routes here if needed */}
//         </Routes>
//       </div>
//     </BrowserRouter>
//   );
// }

// export default App;

import React from 'react';
// Import components from react-router-dom
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Import your page components
import LoginScreen from './components/LoginScreen';
import FormPage from './components/FormPage';
import SubmissionList from './components/SubmissionList'; // <-- 1. Import the new component

// You can import a CSS file for App-level styles if needed
// import './App.css';

function App() {
  return (
    // BrowserRouter wraps everything to enable routing
    <BrowserRouter>
      <div className="App"> {/* Optional wrapper for styling */}

        {/* 3. (Optional) Add Basic Navigation */}
        <nav style={{ padding: '1rem', background: '#f0f0f0', marginBottom: '1rem', textAlign: 'center' }}>
          <Link to="/" style={{ marginRight: '15px' }}>Login</Link>
          <Link to="/form" style={{ marginRight: '15px' }}>Submit Form</Link>
          <Link to="/list">View Submissions</Link> {/* Link to the new route */}
        </nav>

        {/* Routes define which component renders for which path */}
        <Routes>
          {/* Route for the Login page (homepage) */}
          <Route path="/" element={<LoginScreen />} />

          {/* Route for the Form submission page */}
          <Route path="/form" element={<FormPage />} />

          {/* 2. Add the Route for the Submission List page */}
          <Route path="/list" element={<SubmissionList />} />

          {/* You could add a "Not Found" route here later if needed */}
          {/* <Route path="*" element={<div>Page Not Found</div>} /> */}
        </Routes>

      </div>
    </BrowserRouter>
  );
}

export default App;
