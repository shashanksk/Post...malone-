import React, { useEffect, useState, useRef } from 'react';
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

    // --- NEW State for File Upload ---
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null); // To store results { processedRows, successfulInserts, failedInserts, errors: [] }
    const fileInputRef = useRef(null);

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
      setUploadResult(null);
      setSelectedFile(null);
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setMessage('');
      setError('');
      setUploadResult(null); 
      setIsSubmitting(true);

      // --- Frontend Validation ---
      const requiredFields = ['name', 'lastName', 'username', 'email'];
      for (const field of requiredFields) {
        if (!formData[field] || !formData[field].trim()) {
          setError(`Please fill in the '${field}' field.`);
          setIsSubmitting(false);
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
          let errorMessage = `HTTP error! Status: ${response.status}`; 
          try { const errorJson = JSON.parse(responseText); errorMessage = errorJson.message || errorJson.error || responseText || errorMessage; } 
          catch (parseError) { errorMessage = responseText || errorMessage; } if (response.status === 409) { setError(errorMessage || "Username or Email already exists."); } 
          else { setError(`${isEditMode ? 'Update' : 'Submission'} failed: ${errorMessage}.`); } 
          throw new Error(errorMessage);
        }

        // --- Success ---
        let successMessage = isEditMode ? 'Submission updated successfully!' : 'Form submitted successfully!';
        // ... (try parsing JSON success message as before) ...
        setMessage(successMessage);

        if (isEditMode) {
          // Optional: Navigate back to the list after successful update
          setTimeout(() => navigate('/list'), 1500);
        } else {
          setFormData(initialFormData); // Clear form only on successful ADD
        }

      } catch (error) { /* ... (catch block as before, log error) ... */
          console.error(`Caught error during ${isEditMode ? 'update' : 'submission'}:`, error.message);
        } finally {
            setIsSubmitting(false);
          }
    };

    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          setSelectedFile(file);
          setError(''); // Clear previous errors
          setMessage('');
          setUploadResult(null); // Clear previous results
      } else {
          setSelectedFile(null);
          setError('Please select a valid .xlsx file.');
          setUploadResult(null);
      }
      // Reset the input value so the onChange event fires even if the same file is selected again
       if (fileInputRef.current) {
           fileInputRef.current.value = '';
       }
  };

  const handleUploadClick = () => {
      // Trigger the hidden file input
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  };

  const handleUploadSubmit = async () => {
      if (!selectedFile) {
          setError('Please select an Excel (.xlsx) file to upload.');
          return;
      }

      setIsUploading(true);
      setError('');
      setMessage('');
      setUploadResult(null);

      const uploadFormData = new FormData(); // Use browser's FormData for file uploads
      uploadFormData.append('excelFile', selectedFile); // Key MUST match backend r.FormFile("excelFile")

      console.log(`>>> Sending POST to /upload/excel with file: ${selectedFile.name}`);

      try {
          const response = await fetch('/upload/excel', {
              method: 'POST',
              // DO NOT set Content-Type header manually for FormData,
              // the browser does it correctly with the boundary.
              body: uploadFormData,
          });

          const responseText = await response.text();

          if (!response.ok) {
              let errorMessage = `Upload failed! Status: ${response.status}`;
               try {
                   const errorJson = JSON.parse(responseText);
                   errorMessage = errorJson.message || errorJson.error || responseText || errorMessage;
               } catch (parseError) {
                  errorMessage = responseText || errorMessage;
               }
               setError(errorMessage);
               setUploadResult(null); // Clear results on failure
               throw new Error(errorMessage);
          }

          // --- Upload Success (even if some rows failed validation on backend) ---
           try {
               const resultData = JSON.parse(responseText);
               setUploadResult(resultData); // Store detailed results
               setMessage(`Upload processed. See results below.`); // General success message
               setSelectedFile(null); // Clear file selection after successful processing
           } catch (parseError) {
               console.error("Error parsing upload response JSON:", parseError);
               setError("Upload completed, but couldn't parse the result details.");
               setUploadResult(null);
           }


      } catch (error) {
           console.error("Error during Excel upload:", error.message);
          // Error state is already set in the !response.ok block or here if fetch itself failed
           if (!error) { // If fetch itself failed (network error)
               setError(`Upload failed: ${error.message}`);
           }
      } finally {
          setIsUploading(false);
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

        <hr className="separator" /> {/* Separator */}
        {/* Display Success or Error Messages */}
        <div className="upload-section">
          <h2>Or Upload via Excel</h2>
            <p className="upload-instructions">
              Select an .xlsx file with employee data. Ensure columns match the required format (Headers: FirstName, LastName, Username, Email, Password, [Optional Fields]...).
            </p>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }} // Hide the default input
              disabled={isUploading || isSubmitting || isLoading}
            />

            {/* Button to trigger file selection */}
            <button onClick={handleUploadClick} disabled={isUploading || isSubmitting || isLoading} className="button-secondary">
              Choose Excel File (.xlsx)
            </button>

            {selectedFile && <span className="file-name">Selected: {selectedFile.name}</span>}

            {/* Button to trigger the actual upload */}
            <button onClick={handleUploadSubmit} disabled={!selectedFile || isUploading || isSubmitting || isLoading} className="button-upload">
              {isUploading ? 'Uploading...' : 'Upload Data from File'}
            </button>
          </div>

          {/* Display Upload Results */}
          {uploadResult && (
            <div className="upload-results">
              <h3>Upload Summary</h3>
              <p>Processed Rows: {uploadResult.processedRows}</p>
              <p className="success">Successful Inserts: {uploadResult.successfulInserts}</p>
              <p className={uploadResult.failedInserts > 0 ? 'error' : ''}>Failed Rows: {uploadResult.failedInserts}</p>
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <>
                  <h4>Errors:</h4>
                  <ul className="error-list">
                    {uploadResult.errors.map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}

        {message && <p className="form-message success">{message}</p>}
        {error && <p className="form-message error">{error}</p>}
      </div>
    );
  }
  
  export default FormPage;