import React from 'react';
import { useNavigate } from 'react-router-dom';

function LoginScreen() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    
    console.log('Login button clicked, navigating to form...');
    navigate('/form');
  };

  return (
    <div>
      <h1>Login</h1>
      <p>Click the button to proceed to the form.</p>
      <button onClick={handleLoginClick}>Go to Form</button>
    </div>
  );
}

export default LoginScreen;