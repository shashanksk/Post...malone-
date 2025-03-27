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
