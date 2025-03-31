package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/lib/pq"
	_ "github.com/lib/pq" // Underscore means import for side-effects (registering the driver)
)

var db *sql.DB

func initDB() {
	// Load .env file. Ignore error if it doesn't exist (e.g., in production)
	_ = godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPass, dbName)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Error opening database connection: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	fmt.Println("Successfully connected to PostgreSQL database!")

	// Create table if it doesn't exist
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS form_submissions (
		id SERIAL PRIMARY KEY,                            
		name VARCHAR(255),                                
		phone_number VARCHAR(50),                         
		last_name VARCHAR(255),                           
		username VARCHAR(100) UNIQUE,                    
		location_branch VARCHAR(100),                     
		password_hash VARCHAR(255) NOT NULL,              
		email VARCHAR(255) UNIQUE,                        
		basic_salary NUMERIC(12, 2),                      
		gross_salary NUMERIC(12, 2),                      
		address TEXT,                                    
		department VARCHAR(100),                         
		designation VARCHAR(100),                         
		user_role VARCHAR(50),                           
		access_level VARCHAR(50),                         
		created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP 
	);
	`
	_, err = db.Exec(createTableSQL)
	if err != nil {
		log.Fatalf("Error creating table: %v", err)
	}
	fmt.Println("Table 'form_submissions' checked/created successfully.")
}

func insertFormData(data FormData) error {
	// sqlStatement := `
	// INSERT INTO form_submissions (name, phone_number)
	// VALUES ($1, $2)`

	sqlStatement := `
	INSERT INTO form_submissions (
		name, phone_number, last_name, username, location_branch,
		password_hash, email, basic_salary, gross_salary, address,
		department, designation, user_role, access_level
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`

	// _, err := db.Exec(sqlStatement, data.Name, data.PhoneNumber)
	// if err != nil {
	// 	log.Printf("Error executing insert statement: %v", err) // Log error for debugging
	// 	return fmt.Errorf("could not insert form data: %w", err)
	// }
	// return nil

	_, err := db.Exec(sqlStatement,
		data.Name, data.PhoneNumber, data.LastName, data.Username, data.LocationBranch,
		data.PasswordHash, // Pass the HASHED password
		data.Email, data.BasicSalary, data.GrossSalary, data.Address,
		data.Department, data.Designation, data.UserRole, data.AccessLevel,
	)

	if err != nil {
		log.Printf("Error executing insert statement: %v", err)

		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // Unique violation code
				return fmt.Errorf("username or email already exists: %w", err)
			}
		}
		return fmt.Errorf("could not insert form data: %w", err)
	}
	return nil
}

func getSubmissions() ([]SubmissionData, error) {
	query := `SELECT id, name, last_name, username, email, phone_number, location_branch, department, designation FROM form_submissions ORDER BY id DESC`

	rows, err := db.Query(query)

	if err != nil {
		log.Printf("error in querying database for all submissions: %v", err)
		return nil, fmt.Errorf("database queries failed %w", err)
	}

	defer rows.Close()

	submissions := []SubmissionData{}

	for rows.Next() {
		var s SubmissionData
		err := rows.Scan(
			&s.Id,
			&s.Name,
			&s.LastName,
			&s.Username,
			&s.Email,
			&s.PhoneNumber, // Scan directly into string fields
			&s.LocationBranch,
			&s.Department,
			&s.Designation,
		)
		if err != nil {
			log.Print("Error scanning row data")
		}

		submissions = append(submissions, s)
	}

	err = rows.Err()

	for err != nil {
		log.Printf("Error during rows iteration %v", err)
		return nil, fmt.Errorf("error iterating over submissions: %w", err)
	}
	return submissions, nil

}

func deleteSubmissionsByIds(ids []int) error {
	if len(ids) == 0 {
		return nil
	}

	query := `DELETE FROM form_submissions WHERE id = ANY($1)`

	result, err := db.Exec(query, pq.Array(ids))

	if err != nil {
		log.Printf("Error deleting the row %v", err)
		return fmt.Errorf("Database delete failed: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected after delete: %v", err)
		// Don't necessarily return error here, the delete might have worked
	} else {
		log.Printf("Deleted %d row(s)", rowsAffected)
	}

	return nil // Success
}

func checkUserExists(username, email string) (string, error) {
	var existingField string
	// Query to find if username OR email exists, and return which one was found first.
	// LIMIT 1 makes it slightly more efficient as we only need to know *if* one exists.
	query := `
    SELECT
        CASE
            WHEN username = $1 THEN 'username'
            WHEN email = $2 THEN 'email'
            ELSE ''
        END
    FROM form_submissions
    WHERE username = $1 OR email = $2
    LIMIT 1`

	// QueryRow executes a query expected to return at most one row.
	err := db.QueryRow(query, username, email).Scan(&existingField)

	if err != nil {
		// sql.ErrNoRows means the query ran successfully but found no matching rows.
		// This is the "success" case for us - meaning user/email doesn't exist.
		if err == sql.ErrNoRows {
			return "", nil // Return empty string, no error
		}
		// For any other error (connection issue, SQL syntax error, etc.)
		log.Printf("Error checking for existing username/email: %v", err)
		return "", fmt.Errorf("database error checking user existence: %w", err)
	}

	// If we get here without an error, a row was found, and existingField contains "username" or "email"
	return existingField, nil
}

func closeDB() {
	if db != nil {
		db.Close()
		fmt.Println("Database connection closed.")
	}
}
