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
