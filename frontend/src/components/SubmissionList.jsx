import React, { useState, useEffect } from 'react';
import './SubmissionList.css'; // Create this CSS file next

function SubmissionList() {
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set()); // Use a Set to store selected IDs
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation

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

  const handleCheckboxChange = (event, id) => {
    const isChecked = event.target.checked;
    const numericId = Number(id);
    if (isNaN(numericId)) {
      console.error("Invalid ID encountered:", id); // Log error if conversion fails
      return;
    }
    // Create a mutable copy of the Set
    setSelectedIds(prevSelectedIds => {
      const newSelectedIds = new Set(prevSelectedIds); // Clone the set
      if (isChecked) {
        newSelectedIds.add(numericId); // Add ID if checked
      } else {
        newSelectedIds.delete(numericId); // Remove ID if unchecked
      }
      return newSelectedIds; // Return the new set to update state
    });
  };

  // --- Delete Handling ---
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one submission to delete.");
      return;
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} submission(s)?`)) {
        return;
    }


    setIsDeleting(true);
    setError(null); // Clear previous errors

    try {
      const idsToDelete = Array.from(selectedIds); // Convert Set to Array for JSON body
      const requestBody = { ids: idsToDelete }; // Create the object first
      console.log("Sending DELETE request body:", JSON.stringify(requestBody));
      const response = await fetch('/submission', { // DELETE request to the same endpoint
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: idsToDelete }), // Send IDs in the body
      });

      const responseText = await response.text(); // Read response text

      if (!response.ok) {
        // Handle potential JSON error message from backend
        let errorMessage = `HTTP error! Status: ${response.status}`; try { const errorJson = JSON.parse(responseText); errorMessage = errorJson.message || errorJson.error || responseText || errorMessage; } catch (parseError) { errorMessage = responseText || errorMessage; } throw new Error(errorMessage);
      }

      // Success: Update frontend state
      setSubmissions(prevSubmissions =>
        prevSubmissions.filter(sub => !selectedIds.has(sub.id)) // Keep only those not in selectedIds
      );
      setSelectedIds(new Set()); // Clear selection
      alert("Selected submissions deleted successfully!"); // Or use a nicer notification

    } catch (error) {
      console.error("Failed to delete submissions:", error);
      setError(`Delete failed: ${error.message}`); // Set error state to display
    } finally {
      setIsDeleting(false);
    }
  };

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

      <div className="delete-controls">
        <button
          onClick={handleDeleteSelected}
          disabled={selectedIds.size === 0 || isDeleting} // Disable if nothing selected or during delete
        >
          {isDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
        </button>
      </div>


      {isLoading && <div className="loading">Loading submissions...</div>}
      {error && !isLoading && <div className="error">{error}</div>}
      {!isLoading && !error && submissions.length === 0 && <div className="no-data">No submissions found.</div>}

      {!isLoading && submissions.length > 0 && (
        <table className="submission-table">
          <thead>
            <tr>
              <th>{/* Checkbox header */}</th>
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
                <td> {/* Checkbox cell */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(Number(sub.id))} // Check if ID is in the Set - must be set as an integer sub.id
                    onChange={(e) => handleCheckboxChange(e, sub.id)} // Pass event and ID
                  />
                </td>
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
      )}
    </div>
  );
}

export default SubmissionList;
