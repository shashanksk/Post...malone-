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
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings" // For basic validation checks

	"github.com/gorilla/mux"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
)

var expectedHeaders = map[string]string{
	"firstname":       "name",
	"first name":      "name", // Allow variations
	"name":            "name",
	"lastname":        "lastName",
	"last name":       "lastName",
	"username":        "username",
	"email":           "email",
	"email id":        "email",
	"password":        "password", // Expect plain text password in Excel
	"phonenumber":     "phoneNumber",
	"phone number":    "phoneNumber",
	"locationbranch":  "locationBranch",
	"location branch": "locationBranch",
	"basicsalary":     "basicSalary",
	"basic salary":    "basicSalary",
	"grosssalary":     "grossSalary",
	"gross salary":    "grossSalary",
	"address":         "address",
	"department":      "department",
	"designation":     "designation",
	"userrole":        "userRole",
	"user role":       "userRole",
	"accesslevel":     "accessLevel",
	"access level":    "accessLevel",
	// Add other variations if needed
}

type UploadResult struct {
	ProcessedRows     int      `json:"processedRows"`
	SuccessfulInserts int      `json:"successfulInserts"`
	FailedInserts     int      `json:"failedInserts"`
	Errors            []string `json:"errors"`
}

func handleExcelUpload(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	log.Println("Handling POST request for /upload/excel")

	result := UploadResult{}
	var rowErrors []string

	// --- Parse Multipart Form Data ---
	// Adjust max memory (e.g., 10 << 20 for 10 MB) based on expected file size
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		log.Printf("Error parsing multipart form: %v", err)
		http.Error(w, "Error processing file upload. Check file size.", http.StatusBadRequest)
		return
	}

	// --- Get the File ---
	file, fileHeader, err := r.FormFile("excelFile") // "excelFile" MUST match the key used in frontend FormData
	if err != nil {
		log.Printf("Error retrieving file from form: %v", err)
		http.Error(w, "Could not retrieve file. Make sure 'excelFile' is included.", http.StatusBadRequest)
		return
	}
	defer file.Close()

	log.Printf("Received file: %s, Size: %d bytes", fileHeader.Filename, fileHeader.Size)

	// Optional: Validate file type by extension or MIME type if needed
	if !strings.HasSuffix(strings.ToLower(fileHeader.Filename), ".xlsx") {
		http.Error(w, "Invalid file type. Please upload an .xlsx file.", http.StatusBadRequest)
		return
	}

	// --- Read Excel File ---
	f, err := excelize.OpenReader(file)
	if err != nil {
		log.Printf("Error opening excel file %s: %v", fileHeader.Filename, err)
		http.Error(w, "Error reading the uploaded Excel file.", http.StatusInternalServerError)
		return
	}
	defer func() {
		// Close the spreadsheet.
		if err := f.Close(); err != nil {
			log.Printf("Error closing excel file: %v", err)
		}
	}()

	// --- Process Rows (Assuming data is on the first sheet) ---
	sheetName := f.GetSheetName(0) // Get the first sheet's name
	if sheetName == "" {
		http.Error(w, "Excel file seems empty or has no sheets.", http.StatusBadRequest)
		return
	}
	log.Printf("Processing sheet: %s", sheetName)

	rows, err := f.GetRows(sheetName)
	if err != nil {
		log.Printf("Error getting rows from sheet %s: %v", sheetName, err)
		http.Error(w, "Error reading rows from the Excel sheet.", http.StatusInternalServerError)
		return
	}

	if len(rows) <= 1 {
		http.Error(w, "Excel file contains no data rows (only header or empty).", http.StatusBadRequest)
		return
	}

	// --- Map Headers ---
	headerRow := rows[0]
	columnIndex := make(map[string]int)   // Map struct field name -> column index
	foundHeaders := make(map[string]bool) // Track which expected headers were found

	for idx, headerCell := range headerRow {
		normalizedHeader := strings.ToLower(strings.TrimSpace(headerCell))
		if fieldName, ok := expectedHeaders[normalizedHeader]; ok {
			columnIndex[fieldName] = idx
			foundHeaders[fieldName] = true
			log.Printf("Mapped header '%s' (column %d) to field '%s'", headerCell, idx, fieldName)
		}
	}

	// --- Validate Required Headers ---
	// Define which fields are absolutely required from the Excel file
	requiredFields := []string{"name", "lastName", "username", "email", "password"}
	missingHeaders := []string{}
	for _, reqField := range requiredFields {
		if !foundHeaders[reqField] {
			// Try to find the original header name for a better error message
			originalHeader := reqField
			for excelHeader, field := range expectedHeaders {
				if field == reqField {
					originalHeader = excelHeader // Use the first match found
					break
				}
			}
			missingHeaders = append(missingHeaders, originalHeader)
		}
	}

	if len(missingHeaders) > 0 {
		errMsg := fmt.Sprintf("Missing required columns in Excel file: %s", strings.Join(missingHeaders, ", "))
		log.Printf(errMsg)
		http.Error(w, errMsg, http.StatusBadRequest)
		return
	}

	// --- Process Data Rows ---
	result.ProcessedRows = len(rows) - 1 // Exclude header row

	for i, row := range rows {
		if i == 0 {
			continue // Skip header row
		}
		excelRowNum := i + 1 // For user-friendly error messages (1-based index)

		formData := FormData{} // Create a new FormData for each row

		// Helper function to get cell value safely
		getCellValue := func(fieldName string) string {
			if idx, ok := columnIndex[fieldName]; ok {
				if idx < len(row) {
					return strings.TrimSpace(row[idx])
				}
			}
			return "" // Return empty string if column not found or row is too short
		}

		// --- Populate formData from row ---
		formData.Name = getCellValue("name")
		formData.LastName = getCellValue("lastName")
		formData.Username = getCellValue("username")
		formData.Email = getCellValue("email")
		formData.Password = getCellValue("password") // Get plain text password
		formData.PhoneNumber = getCellValue("phoneNumber")
		formData.LocationBranch = getCellValue("locationBranch")
		formData.Address = getCellValue("address")
		formData.Department = getCellValue("department")
		formData.Designation = getCellValue("designation")
		formData.UserRole = getCellValue("userRole")
		formData.AccessLevel = getCellValue("accessLevel")

		// Convert numeric fields (handle errors)
		basicSalaryStr := getCellValue("basicSalary")
		if basicSalaryStr != "" {
			salary, err := strconv.ParseFloat(basicSalaryStr, 64)
			if err != nil {
				rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Invalid Basic Salary value '%s'. Skipping.", excelRowNum, basicSalaryStr))
				continue // Skip this row
			}
			formData.BasicSalary = salary
		}
		grossSalaryStr := getCellValue("grossSalary")
		if grossSalaryStr != "" {
			salary, err := strconv.ParseFloat(grossSalaryStr, 64)
			if err != nil {
				rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Invalid Gross Salary value '%s'. Skipping.", excelRowNum, grossSalaryStr))
				continue // Skip this row
			}
			formData.GrossSalary = salary
		}

		// --- Validate Row Data ---
		if formData.Name == "" || formData.LastName == "" || formData.Username == "" || formData.Email == "" || formData.Password == "" {
			rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Missing required fields (Name, LastName, Username, Email, Password). Skipping.", excelRowNum))
			continue
		}
		if !isValidEmail(formData.Email) {
			rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Invalid Email format '%s'. Skipping.", excelRowNum, formData.Email))
			continue
		}

		// Check for existing user BEFORE hashing password (save resources)
		existingField, err := checkUserExists(formData.Username, formData.Email)
		if err != nil {
			log.Printf("Row %d: Database error checking user existence for '%s'/'%s': %v", excelRowNum, formData.Username, formData.Email, err)
			rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Error checking database for username/email. Skipping.", excelRowNum))
			continue // Skip this row due to DB error
		}
		if existingField != "" {
			rowErrors = append(rowErrors, fmt.Sprintf("Row %d: %s '%s' already exists. Skipping.", excelRowNum, strings.Title(existingField), getCellValue(existingField)))
			continue
		}

		// --- Hash Password ---
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(formData.Password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("Row %d: Error hashing password for user '%s': %v", excelRowNum, formData.Username, err)
			rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Error processing password. Skipping.", excelRowNum))
			continue
		}
		formData.PasswordHash = string(hashedPassword)
		formData.Password = ""             // Clear plain text password
		formData.PasswordConfirmation = "" // Not needed here

		// --- Insert Data ---
		err = insertFormData(formData)
		if err != nil {
			// Attempt to give a more specific error
			dbErrStr := err.Error()
			if strings.Contains(dbErrStr, "already exists") {
				// Should ideally be caught by checkUserExists, but as a fallback
				rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Failed to insert - Username or Email likely already exists (conflict). Skipping.", excelRowNum))
			} else {
				log.Printf("Row %d: Failed to insert data for user '%s': %v", excelRowNum, formData.Username, err)
				rowErrors = append(rowErrors, fmt.Sprintf("Row %d: Failed to save to database. Skipping.", excelRowNum))
			}
			continue // Skip to next row on insertion failure
		}

		// --- Success for this row ---
		result.SuccessfulInserts++
		log.Printf("Successfully inserted row %d (User: %s)", excelRowNum, formData.Username)

	} // End of row processing loop

	// --- Finalize Results ---
	result.FailedInserts = len(rowErrors)
	result.Errors = rowErrors

	log.Printf("Excel Upload Summary: Processed=%d, Succeeded=%d, Failed=%d", result.ProcessedRows, result.SuccessfulInserts, result.FailedInserts)

	// --- Send Response ---
	w.Header().Set("Content-Type", "application/json")
	// Send 200 OK even if there were row errors, the details are in the body
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

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

	// ***** ADD THIS LOGGING *****
	log.Printf("--- Backend Received Data (handleFormSubmit) ---")
	log.Printf("Raw Password Received: [%s]", formData.Password)
	log.Printf("Raw Confirmation Received: [%s]", formData.PasswordConfirmation)
	log.Printf("-----------------------------------------------")
	// ****************************

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

	existingField, err := checkUserExists(formData.Username, formData.Email)
	if err != nil {
		// A database error occurred during the check
		log.Printf("Database error during user existence check: %v", err)
		http.Error(w, "Error checking user details. Please try again later.", http.StatusInternalServerError)
		return
	}
	if existingField != "" {
		// Username or Email already exists
		errorMessage := fmt.Sprintf("%s already exists. Please choose another.", strings.Title(existingField)) // Capitalize "Username" or "Email"
		log.Printf("Submission rejected: %s", errorMessage)
		// Send a 409 Conflict status code
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict) // 409 Conflict
		json.NewEncoder(w).Encode(map[string]string{"message": errorMessage})
		return // Stop processing
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

func handleGetSingleSubmission(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from URL path parameter
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Missing submission ID in URL path", http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(idStr) // Convert string ID to integer

	if err != nil {
		http.Error(w, "Invalid submission ID format in URL path", http.StatusBadRequest)
		return
	}

	log.Printf("Handling GET request for /submission/%d", id)

	// Fetch data from database
	submission, err := getSubmissionById(id)
	if err != nil {
		// Check if it was specifically a "not found" error
		if strings.Contains(err.Error(), "not found") {
			log.Printf("Submission not found for ID %d", id)
			http.Error(w, err.Error(), http.StatusNotFound) // 404 Not Found
		} else {
			// Other database error
			log.Printf("Database error fetching submission ID %d: %v", id, err)
			http.Error(w, "Failed to retrieve submission.", http.StatusInternalServerError)
		}
		return
	}

	// Marshal and send response
	jsonData, err := json.Marshal(submission)
	if err != nil { /* ... handle marshal error ... */
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write(jsonData)
	log.Printf("Successfully returned submission ID %d", id)
}

func handleUpdateSubmission(w http.ResponseWriter, r *http.Request) {
	log.Println("====== handleUpdateSubmission Function Entered ======")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS") // Allow PUT
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	// Use PUT for replacing/updating the resource representation
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// --- Get ID from URL ---
	vars := mux.Vars(r)
	idStr, ok := vars["id"]
	if !ok {
		http.Error(w, "Missing submission ID", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Invalid submission ID", http.StatusBadRequest)
		return
	}

	log.Printf("Handling PUT request for /submissions/%d", id)

	// --- Decode Request Body ---
	var formData FormData // Use FormData to receive potential new password
	decoder := json.NewDecoder(r.Body)
	err = decoder.Decode(&formData)
	if err != nil { /* ... handle bad request ... */
	}
	defer r.Body.Close()

	// --- Validation (Optional but recommended) ---
	// Add validation similar to handleFormSubmit if needed (e.g., email format)
	if formData.Email != "" && !isValidEmail(formData.Email) {
		http.Error(w, "Invalid Email format", http.StatusBadRequest)
		return
	}
	// Check for username/email conflicts *excluding the current user* (more complex query needed)

	// --- Handle Password Update ---
	// If a new password was provided in the form, hash it.
	// Otherwise, PasswordHash remains empty in formData, and updateSubmission ignores it.
	if strings.TrimSpace(formData.Password) != "" {
		// Optional: Add password confirmation check if desired for updates too
		if formData.Password != formData.PasswordConfirmation {
			http.Error(w, "Passwords do not match", http.StatusBadRequest)
			return
		}
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(formData.Password), bcrypt.DefaultCost)
		if err != nil { /* ... handle hashing error ... */
		}
		formData.PasswordHash = string(hashedPassword) // Set the hash to be saved
	}

	// --- Call Database Update ---
	err = updateSubmission(id, formData)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			log.Printf("Update failed: Submission not found for ID %d", id)
			http.Error(w, err.Error(), http.StatusNotFound) // 404 Not Found
		} else if strings.Contains(err.Error(), "unique constraint") {
			log.Printf("Update failed: Unique constraint violation for ID %d: %v", id, err)
			// Determine if it was username or email if possible
			http.Error(w, "Username or Email already taken.", http.StatusConflict) // 409 Conflict
		} else {
			log.Printf("Database error updating submission ID %d: %v", id, err)
			http.Error(w, "Failed to update submission.", http.StatusInternalServerError)
		}
		return
	}

	// --- Success Response ---
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK) // 200 OK
	// Optionally return the updated object or just a success message
	json.NewEncoder(w).Encode(map[string]string{"message": "Submission updated successfully!"})

	log.Printf("Successfully updated submission ID %d", id)
}
