import React, { useState } from 'react';
import './FormPage.css';

// function FormPage() {
//   const [formData, setFormData] = useState({
//     name: '',
//     phoneNumber: '',
//   });
//   const [message, setMessage] = useState(''); // To display success/error messages
//   const [error, setError] = useState('');

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prevState => ({
//       ...prevState,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault(); // Prevent default form submission behavior
//     setMessage(''); // Clear previous messages
//     setError('');

//     // Basic frontend validation
//     if (!formData.name || !formData.phoneNumber) {
//       setError('Please fill in both Name and Phone Number.');
//       return;
//     }

//     console.log('Submitting form data:', formData);

//     try {
//       // Send data to the Go backend
//       const response = await fetch('http://localhost:8080/submit', { // Ensure this matches your Go backend URL/port
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(formData),
//       });

//       const responseData = await response.json(); // Always try to parse JSON

//       if (!response.ok) {
//         // Handle HTTP errors (e.g., 400, 500)
//         throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
//       }

//       // Success
//       console.log('Success response:', responseData);
//       setMessage(responseData.message); // Display success message from backend
//       setFormData({ name: '', phoneNumber: '' }); // Clear the form

//     } catch (error) {
//       console.error('Error submitting form:', error);
//       setError(`Submission failed: ${error.message}. Check console for details.`); // Display specific error
//     }
//   };

//   return (
//     <div>
//       <h1>Submission Form</h1>
//       <form onSubmit={handleSubmit}>
//         <div>
//           <label htmlFor="name">Name:</label>
//           <input
//             type="text"
//             id="name"
//             name="name"
//             value={formData.name}
//             onChange={handleChange}
//             required // HTML5 validation
//           />
//         </div>
//         <div>
//           <label htmlFor="phoneNumber">Phone Number:</label>
//           <input
//             type="tel" // Use type="tel" for phone numbers
//             id="phoneNumber"
//             name="phoneNumber"
//             value={formData.phoneNumber}
//             onChange={handleChange}
//             required // HTML5 validation
//           />
//         </div>
//         <button type="submit">Submit</button>
//       </form>

//       {/* Display Success or Error Messages */}
//       {message && <p style={{ color: 'green' }}>{message}</p>}
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//     </div>
//   );
// }

// export default FormPage;

function FormPage() {
    const initialFormData = {
      name: '',
      phoneNumber: '',
      lastName: '',
      username: '',
      locationBranch: '',
      password: '',
      passwordConfirmation: '',
      email: '',
      basicSalary: '', // Keep as string initially for input field flexibility
      grossSalary: '', // Keep as string initially
      address: '',
      department: '',
      designation: '',
      userRole: '',
      accessLevel: '',
    };
  
    const [formData, setFormData] = useState(initialFormData);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
  
    const handleChange = (e) => {
      const { name, value, type } = e.target;
  
      // Clear messages on new input
      setMessage('');
      setError('');
  
      setFormData(prevState => ({
        ...prevState,
        [name]: value,
      }));
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage('');
      setError('');
  
      // --- Frontend Validation ---
      const requiredFields = ['name', 'lastName', 'username', 'email', 'password', 'passwordConfirmation'];
      for (const field of requiredFields) {
        if (!formData[field] || !formData[field].trim()) {
          setError(`Please fill in the '${field}' field.`);
          return;
        }
      }
  
      if (formData.password !== formData.passwordConfirmation) {
        setError('Passwords do not match.');
        return;
      }
  
      // Basic email format check (can be more robust)
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
  
      // Convert salary fields to numbers before sending (or handle on backend)
      const dataToSend = {
        ...formData,
        // Use parseFloat, handle potential NaN if input is invalid
        basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : 0,
        grossSalary: formData.grossSalary ? parseFloat(formData.grossSalary) : 0,
      };
  
      console.log('Submitting form data:', dataToSend);
  
      try {
        // const response = await fetch('http://localhost:8080/submit', {
        const response = await fetch('submission', { //for docker
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });
  
        // Try to parse JSON regardless of status code for potential error messages
        let responseData;
        try {
           responseData = await response.json();
        } catch (jsonError) {
           // If JSON parsing fails, use the raw response text
           const textResponse = await response.text();
           throw new Error(textResponse || `HTTP error! Status: ${response.status}`);
        }
  
  
        if (!response.ok) {
          // Use message from backend JSON response if available
          throw new Error(responseData.message || responseData.error || `HTTP error! Status: ${response.status}`);
        }
  
        // Success
        console.log('Success response:', responseData);
        setMessage(responseData.message || 'Form submitted successfully!');
        setFormData(initialFormData); // Clear the form on success
  
      } catch (error) {
        console.error('Error submitting form:', error);
        setError(`Submission failed: ${error.message}.`);
      }
    };
  
    return (
      <div className="form-container">
        <h1>Employee Information Form</h1>
        <form onSubmit={handleSubmit} noValidate> {/* noValidate disables browser default validation bubbles */}
          <div className="form-grid">
  
            {/* --- Required Fields --- */}
            <div className="form-group">
              <label htmlFor="name">First Name *</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input type="text" id="username" name="username" value={formData.username} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email ID *</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="passwordConfirmation">Confirm Password *</label>
              <input type="password" id="passwordConfirmation" name="passwordConfirmation" value={formData.passwordConfirmation} onChange={handleChange} required />
            </div>
  
            {/* --- Optional Fields --- */}
             <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />
            </div>
             <div className="form-group">
              <label htmlFor="locationBranch">Location Branch</label>
              <input type="text" id="locationBranch" name="locationBranch" value={formData.locationBranch} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="basicSalary">Basic Salary</label>
              <input type="number" id="basicSalary" name="basicSalary" value={formData.basicSalary} onChange={handleChange} step="0.01" min="0"/>
            </div>
            <div className="form-group">
              <label htmlFor="grossSalary">Gross Salary</label>
              <input type="number" id="grossSalary" name="grossSalary" value={formData.grossSalary} onChange={handleChange} step="0.01" min="0"/>
            </div>
            <div className="form-group form-group-full-width"> {/* Spans full width */}
              <label htmlFor="address">Address</label>
              <textarea id="address" name="address" value={formData.address} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="department">Department</label>
              <input type="text" id="department" name="department" value={formData.department} onChange={handleChange} />
              {/* Consider <select> if options are predefined */}
            </div>
            <div className="form-group">
              <label htmlFor="designation">Designation</label>
              <input type="text" id="designation" name="designation" value={formData.designation} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="userRole">User Role</label>
               {/* Consider <select> */}
              <input type="text" id="userRole" name="userRole" value={formData.userRole} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="accessLevel">Access Level</label>
               {/* Consider <select> */}
              <input type="text" id="accessLevel" name="accessLevel" value={formData.accessLevel} onChange={handleChange} />
            </div>
  
            <button type="submit">Submit Employee Data</button>
  
          </div>{/* end form-grid */}
        </form>
  
        {/* Display Success or Error Messages */}
        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}
      </div>
    );
  }
  
  export default FormPage;