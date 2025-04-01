package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
)

// Logging Middleware Function
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("--- Request Received --- Method: [%s], Path: [%s], RemoteAddr: [%s]",
			r.Method, r.URL.Path, r.RemoteAddr) // Log URL.Path for exact path match check
		next.ServeHTTP(w, r) // Pass request to the next handler (CORS -> Mux Router)
	})
}

func main() {
	// Load .env file first
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Could not load .env file. Using environment variables directly.")
	}

	// Initialize Database Connection
	initDB()
	defer closeDB() // Ensure DB connection is closed when main exits

	// Initialize Router
	router := mux.NewRouter()

	// Define API route
	router.HandleFunc("/submit", handleFormSubmit).Methods("POST", "OPTIONS") // Allow OPTIONS for CORS preflight
	router.HandleFunc("/submission", handleGetSubmissions).Methods("GET", "OPTIONS")
	router.HandleFunc("/submission", handleDeleteSubmissions).Methods("DELETE", "OPTIONS")
	router.HandleFunc("/submission/{id:[0-9]+}", handleGetSingleSubmission).Methods("GET", "OPTIONS")
	router.HandleFunc("/submission/{id:[0-9]+}", handleUpdateSubmission).Methods("PUT", "OPTIONS")
	// CORS Configuration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost"}, // Vite's default port
		AllowedMethods:   []string{"POST", "GET", "OPTIONS", "DELETE", "PUT"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
		// Debug:       true, // Enable for debugging CORS issues
		// no idea what this does
	})

	// handler := c.Handler(router) // Apply CORS middleware
	corsHandler := c.Handler(router)
	loggedHandler := loggingMiddleware(corsHandler)

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default backend port
	}

	// Start Server
	fmt.Printf("Backend server starting on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, loggedHandler)) // Use the CORS-wrapped handler
}
