package main

type FormData struct {
	Name                 string  `json:"name"`
	PhoneNumber          string  `json:"phonenumber"`
	LastName             string  `json:"lastName"`
	Username             string  `json:"username"`
	LocationBranch       string  `json:"locationBranch"`
	Password             string  `json:"password"`
	PasswordConfirmation string  `json:"passwordConfirmation"`
	Email                string  `json:"email"`
	BasicSalary          float64 `json:"basicSalary"`
	GrossSalary          float64 `json:"grossSalary"`
	Address              string  `json:"address"`
	Department           string  `json:"department"`
	Designation          string  `json:"designation"`
	UserRole             string  `json:"userRole"`
	AccessLevel          string  `json:"accessLevel"`

	// This field is calculated in the handler, not directly from JSON input for password
	PasswordHash string `json:"-"` // Exclude this from normal JSON marshaling/unmarshaling if needed
}

type SubmissionData struct {
	Id             string  `json:"id"`
	Name           string  `json:"name"`
	PhoneNumber    string  `json:"phonenumber,omitempty"`
	LastName       string  `json:"lastname"`
	Username       string  `json:"username"`
	LocationBranch string  `json:"locationBranch,omitempty"`
	Email          string  `json:"email"`
	BasicSalary    float64 `json:"basicSalary,omitempty"`
	GrossSalary    float64 `json:"grossSalary,omitempty"`
	Address        string  `json:"address,omitempty"`
	Department     string  `json:"departmen,omitempty"`
	Designation    string  `json:"designation,omitempty"`
	UserRole       string  `json:"userRole,omitempty"`
	AccessLevel    string  `json:"accessLevel,omitempty"`
}
