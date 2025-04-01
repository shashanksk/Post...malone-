import React, { useEffect, useState } from 'react';
import './FormPage.css';
import { useParams, useNavigate } from 'react-router-dom';

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

    const { id } = useParams(); // Get the 'id' parameter from the URL, if present
    const navigate = useNavigate(); // Hook to programmatically navigate
    const isEditMode = Boolean(id); // Determine if we are in edit mode based on ID presence
    const [isSubmitting, setIsSubmitting] = useState(false); // Tracks if submit/update is in progress
    const [isLoading, setIsLoading] = useState(false); // For loading edit data (initial value might be true if you load immediately)


    const [formData, setFormData] = useState(initialFormData);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Only run if in edit mode (ID exists)
        if (isEditMode) {
            setIsLoading(true);
            setError(null); // Clear previous errors
            setMessage('');
            console.log(`Edit mode: Fetching data for ID: ${id}`);

            const fetchSubmissionData = async () => {
                try {
                  // Fetch data for the specific ID
                  const response = await fetch(`/submission/${id}`); // GET request to /submissions/{id}
                  const responseText = await response.text();

                  if (!response.ok) {
                    let errorMessage = `HTTP error! Status: ${response.status}`; try { const errorJson = JSON.parse(responseText); errorMessage = errorJson.message || errorJson.error || responseText || errorMessage; } catch (parseError) { errorMessage = responseText || errorMessage; } throw new Error(errorMessage);
                  }

                  try {
                    const jsonData = JSON.parse(responseText);
                    console.log("Raw data received:", jsonData); 
                    // Populate form state with fetched data
                    // Ensure field names match exactly
                    setFormData({
                      name: jsonData.name || '',
                      lastName: jsonData.lastname || '',
                      username: jsonData.username || '',
                      email: jsonData.email || '',
                      phoneNumber: jsonData.phonenumber || '',
                      locationBranch: jsonData.locationBranch || '',
                      department: jsonData.department || '',
                      designation: jsonData.designation || '',
                      // Reset password fields for edit mode - user must re-enter if changing
                      password: '',
                      passwordConfirmation: '',
                      // Include other fields if they exist in SubmissionInfo and the form
                      basicSalary: jsonData.basicSalary || '', // Assuming these come back
                      grossSalary: jsonData.grossSalary || '',
                      address: jsonData.address || '',
                      userRole: jsonData.userRole || '',
                      accessLevel: jsonData.accessLevel || '',
                    });
                  } catch (parseError) { /* ... handle invalid JSON from GET /submissions/{id} ... */ }

                } catch (error) {
                    console.error("Failed to fetch submission data:", error);
                    setError(`Failed to load data: ${error.message}. Please go back to the list.`);
                    // Disable form or redirect? For now, just show error.
                } finally {
                    setIsLoading(false);
                }
            };

            fetchSubmissionData();
        } else {
            // If not in edit mode, ensure form is reset to initial state
            setFormData(initialFormData);
            setMessage('');
            setError('');
        }
    }, [id, isEditMode]); // Re-run effect if id changes (navigating between edits)
  
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

      for (const field of requiredFields) { /* ... check non-password fields ... */ }
      
      // Password validation - only require if NOT in edit mode OR if password field has been touched
      if (!isEditMode) {
        // ADD mode: Password and Confirmation are strictly required
        if (!formData.password || !formData.password.trim()) {
            setError("Please fill in the 'password' field.");
            setIsSubmitting(false);
            return;
        }
        if (!formData.passwordConfirmation || !formData.passwordConfirmation.trim()) {
            setError("Please fill in the 'Confirm Password' field.");
            setIsSubmitting(false);
            return;
        }
        if (formData.password !== formData.passwordConfirmation) {
            setError('Passwords do not match.');
            setIsSubmitting(false);
            return;
        }
      } else {
          // EDIT mode: Check only if user intends to change password
          if (formData.password || formData.passwordConfirmation) {
            // If *either* field is filled, *both* must be filled and match
            if (!formData.password || !formData.passwordConfirmation) {
              setError("Please fill in *both* Password and Confirm Password fields if changing the password.");
              setIsSubmitting(false);
              return;
            }
            if (formData.password !== formData.passwordConfirmation) {
              setError('Passwords do not match.');
              setIsSubmitting(false);
              return;
            }
            // If they match and are filled, the password will be included in dataToSend later
          }
          // If both password fields are empty in edit mode, we proceed without password validation errors.
        }
  
      // Basic email format check (can be more robust)
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
  
      // Convert salary fields to numbers before sending (or handle on backend)
      // const dataToSend = {
      //   ...formData,
      //   // Use parseFloat, handle potential NaN if input is invalid
      //   basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : 0,
      //   grossSalary: formData.grossSalary ? parseFloat(formData.grossSalary) : 0,
      // };
      const dataToSend = { ...formData };
      //delete dataToSend.passwordConfirmation; // Always remove confirmation
      dataToSend.basicSalary = dataToSend.basicSalary ? parseFloat(dataToSend.basicSalary) : 0;
      dataToSend.grossSalary = dataToSend.grossSalary ? parseFloat(dataToSend.grossSalary) : 0;
      // If password field is empty during edit, don't send it or handle on backend
      if (isEditMode && dataToSend.password === '') {
          delete dataToSend.password; // Don't send empty password for update
      }

      const url = isEditMode ? `/submission/${id}` : '/submit';
      const method = isEditMode ? 'PUT' : 'POST';
      console.log(`>>> Sending ${method} to ${url} with PAYLOAD:`, JSON.stringify(dataToSend, null, 2));

      try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
        });
        const responseText = await response.text();

        if (!response.ok) { /* ... (handle non-OK status, including 409 for edit) ... */
             let errorMessage = `HTTP error! Status: ${response.status}`; try { const errorJson = JSON.parse(responseText); errorMessage = errorJson.message || errorJson.error || responseText || errorMessage; } catch (parseError) { errorMessage = responseText || errorMessage; } if (response.status === 409) { setError(errorMessage || "Username or Email already exists."); } else { setError(`${isEditMode ? 'Update' : 'Submission'} failed: ${errorMessage}.`); } throw new Error(errorMessage);
        }

        // --- Success ---
        let successMessage = isEditMode ? 'Submission updated successfully!' : 'Form submitted successfully!';
        // ... (try parsing JSON success message as before) ...
        setMessage(successMessage);

        if (isEditMode) {
            // Optional: Navigate back to the list after successful update
            navigate('/list');
        } else {
            setFormData(initialFormData); // Clear form only on successful ADD
        }

      } catch (error) { /* ... (catch block as before, log error) ... */
          console.error(`Caught error during ${isEditMode ? 'update' : 'submission'}:`, error.message);
        } finally {
            setIsSubmitting(false);
          }
    };
  
    return (
      <div className="form-container">
        <h1>{isEditMode ? 'Edit Employee Information' : 'Add Employee Information'}</h1>
        {/* Display Messages */}
        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}

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
              <label htmlFor="password">Password {isEditMode ? '(Leave blank to keep unchanged)' : '*'}</label>
              <input
                  type="password"
                  id="password"
                  name="password" // <-- NAME should be "password"
                  value={formData.password} // <-- VALUE should be formData.password
                  onChange={handleChange}
                  required={!isEditMode} // Only required on add
              />
            </div>
            <div className="form-group">
                <label htmlFor="passwordConfirmation">Confirm Password {isEditMode && !formData.password ? '' : '*'}</label>
                <input
                    type="password"
                    id="passwordConfirmation"
                    name="passwordConfirmation" // <-- NAME should be "passwordConfirmation"
                    value={formData.passwordConfirmation} // <-- VALUE should be formData.passwordConfirmation
                    onChange={handleChange}
                    // Required only if adding OR if editing and the main password field has content
                    required={!isEditMode || (isEditMode && !!formData.password)}
              />
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
  
            {/* <button type="submit">Submit Employee Data</button> */}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Update Employee Data' : 'Submit Employee Data')}
            </button>
  
          </div>{/* end form-grid */}
        </form>
  
        {/* Display Success or Error Messages */}
        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}
      </div>
    );
  }
  
  export default FormPage;