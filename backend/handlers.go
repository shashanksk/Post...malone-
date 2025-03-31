package main

// func handleFormSubmit(w http.ResponseWriter, r *http.Request) {
// 	// Set CORS headers for the response (important for browser interaction)
// 	w.Header().Set("Access-Control-Allow-Origin", "*") // Adjust in production!
// 	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
// 	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")

// 	// Handle OPTIONS preflight request for CORS
// 	if r.Method == http.MethodOptions {
// 		w.WriteHeader(http.StatusOK)
// 		return
// 	}

// 	if r.Method != http.MethodPost {
// 		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
// 		return
// 	}

// 	var formData FormData
// 	decoder := json.NewDecoder(r.Body)
// 	err := decoder.Decode(&formData)
// 	if err != nil {
// 		log.Printf("Error decoding JSON request body: %v", err)
// 		http.Error(w, "Invalid request body", http.StatusBadRequest)
// 		return
// 	}
// 	defer r.Body.Close() // Good practice to close the request body

// 	// Basic Validation (Add more robust validation as needed)
// 	if formData.Name == "" || formData.PhoneNumber == "" {
// 		http.Error(w, "Name and Phone Number are required", http.StatusBadRequest)
// 		return
// 	}

// 	log.Printf("Received form data: Name=%s, PhoneNumber=%s", formData.Name, formData.PhoneNumber)

// 	err = insertFormData(formData)
// 	if err != nil {
// 		// Log the detailed error on the server
// 		log.Printf("Failed to insert data into database: %v", err)
// 		// Send a generic error message to the client
// 		http.Error(w, "Failed to save data. Please try again later.", http.StatusInternalServerError)
// 		return
// 	}

// 	log.Printf("Successfully inserted data for Name=%s", formData.Name)

// 	w.Header().Set("Content-Type", "application/json")
// 	w.WriteHeader(http.StatusOK) // Explicitly set status to 200 OK
// 	json.NewEncoder(w).Encode(map[string]string{"message": "Form submitted successfully!"})
// }

import (
	"encoding/json"
	"log"
	"net/http"
	"strings" // For basic validation checks

	"golang.org/x/crypto/bcrypt"
)

// Simple email validation (can be improved with regex)
func isValidEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}

func handleFormSubmit(w http.ResponseWriter, r *http.Request) {
	// CORS Headers (redundant if using CORS middleware, but safe)
	w.Header().Set("Access-Control-Allow-Origin", "*") // Adjust in production!
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var formData FormData
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&formData)
	if err != nil {
		log.Printf("Error decoding JSON request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// --- Server-Side Validation ---
	if strings.TrimSpace(formData.Name) == "" ||
		strings.TrimSpace(formData.LastName) == "" ||
		strings.TrimSpace(formData.Username) == "" ||
		strings.TrimSpace(formData.Email) == "" ||
		strings.TrimSpace(formData.Password) == "" {
		http.Error(w, "Required fields (Name, Last Name, Username, Email, Password) cannot be empty", http.StatusBadRequest)
		return
	}

	if !isValidEmail(formData.Email) {
		http.Error(w, "Invalid Email format", http.StatusBadRequest)
		return
	}

	if formData.Password != formData.PasswordConfirmation {
		http.Error(w, "Passwords do not match", http.StatusBadRequest)
		return
	}

	// --- Password Hashing ---
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(formData.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		http.Error(w, "Error processing request", http.StatusInternalServerError)
		return
	}
	// Store the hash in the struct field that will be used for DB insertion
	formData.PasswordHash = string(hashedPassword)

	log.Printf("Received submission for Username: %s", formData.Username)

	// --- Database Insertion ---
	err = insertFormData(formData) // Pass the struct containing the hashed password
	if err != nil {
		log.Printf("Failed to insert data into database for %s: %v", formData.Username, err)
		// Send specific error back if it's a known issue (like unique constraint)
		if strings.Contains(err.Error(), "already exists") {
			http.Error(w, "Username or Email already exists.", http.StatusConflict) // 409 Conflict
		} else {
			http.Error(w, "Failed to save data. Please try again later.", http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Successfully inserted data for Username: %s", formData.Username)

	// --- Success Response ---
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Form submitted successfully!"})
}

func handleGetSubmissions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Handling GET request for /submissions")

	// Call the database function to get data
	submissions, err := getSubmissions()
	if err != nil {
		// Log the detailed error on the server
		log.Printf("Error fetching submissions from database: %v", err)
		// Send a generic error message to the client
		http.Error(w, "Failed to retrieve submissions.", http.StatusInternalServerError)
		return
	}

	// Marshal the Go slice of structs into JSON
	jsonData, err := json.Marshal(submissions)
	if err != nil {
		log.Printf("Error marshaling submissions to JSON: %v", err)
		http.Error(w, "Failed to process data.", http.StatusInternalServerError)
		return
	}

	// Set response headers and send the JSON data
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	w.Write(jsonData)

	log.Printf("Successfully returned %d submissions.", len(submissions))

}

func handleDeleteSubmissions(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")                // Adjust in production!
	w.Header().Set("Access-Control-Allow-Methods", "DELETE, OPTIONS") // Allow DELETE
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Handle OPTIONS preflight request
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Ensure method is DELETE
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Handling DELETE request for /submissions")

	// Decode the request body containing the IDs
	var deleteReq DeleteRequest
	decoder := json.NewDecoder(r.Body)
	err := decoder.Decode(&deleteReq)
	if err != nil {
		log.Printf("Error decoding DELETE request body: %v", err)
		http.Error(w, "Invalid request body. Expected JSON like {\"ids\": [1, 2, ...]}", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Basic validation: Check if IDs array exists or is empty
	if deleteReq.Ids == nil || len(deleteReq.Ids) == 0 {
		log.Println("Received delete request with no IDs provided.")
		http.Error(w, "No submission IDs provided to delete.", http.StatusBadRequest)
		return
	}

	log.Printf("Attempting to delete submission IDs: %v", deleteReq.Ids)

	// Call the database function to delete the records
	err = deleteSubmissionsByIds(deleteReq.Ids)
	if err != nil {
		log.Printf("Error deleting submissions from database: %v", err)
		http.Error(w, "Failed to delete submissions.", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK is fine, could also use 204 No Content if not sending body
	json.NewEncoder(w).Encode(map[string]string{"message": "Selected submissions deleted successfully!"})

	log.Printf("Successfully processed deletion for IDs: %v", deleteReq.Ids)
}
