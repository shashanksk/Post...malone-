import React, { useState, useEffect } from 'react';
import './SubmissionList.css'; // Create this CSS file next

function SubmissionList() {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/submission'); // API call

        // --- Read body ONCE as text ---
        const responseText = await response.text();

        // --- Check status code AFTER reading text ---
        if (!response.ok) {
          let errorMessage = `HTTP error! Status: ${response.status}`;
          try {
            // Try parsing error text as JSON
            const errorJson = JSON.parse(responseText);
            errorMessage = errorJson.message || errorJson.error || responseText || errorMessage;
          } catch (parseError) {
            // Use raw text if not JSON
            errorMessage = responseText || errorMessage;
          }
          throw new Error(errorMessage); // Go to outer catch block
        }

        // --- Process SUCCESS response (response.ok is true) ---
        try {
          // Try to parse the response text as JSON
          const jsonData = JSON.parse(responseText);
          setSubmissions(jsonData || []); // Set state with parsed data, ensuring it's an array

        } catch (parseError) {
           // If parsing fails even on success, the backend sent invalid JSON
           console.error("Backend sent non-JSON response even though status was OK:", responseText);
           throw new Error("Received an invalid format from the server."); // Inform user
        }

      } catch (error) {
        // Handles network errors or errors thrown explicitly above
        console.error("Failed to fetch submissions:", error);
        setError(error.message); // Display the error message
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

  }, []); // Empty dependency array means this effect runs once on mount

  // --- Render Logic ---
  if (isLoading) {
    return <div className="loading">Loading submissions...</div>;
  }

  if (error) {
    return <div className="error">Error loading submissions: {error}</div>;
  }

  if (submissions.length === 0) {
    return <div className="no-data">No submissions found.</div>
  }

  return (
    <div className="submission-list-container">
      <h2>Submitted Data</h2>
      <table className="submission-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Branch</th>
            <th>Department</th>
            <th>Designation</th>
            {/* Add more <th> headers if you included more fields */}
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr key={sub.id}>
              <td>{sub.id}</td>
              <td>{sub.name}</td>
              <td>{sub.lastName}</td>
              <td>{sub.username}</td>
              <td>{sub.email}</td>
              <td>{sub.phoneNumber}</td>
              <td>{sub.locationBranch}</td>
              <td>{sub.department}</td>
              <td>{sub.designation}</td>
              {/* Add more <td> data cells if needed */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SubmissionList;
