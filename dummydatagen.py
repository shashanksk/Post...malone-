import openpyxl
import os

# Define the header row
headers = [
    "FirstName", "LastName", "Username", "Email", "Password",
    "PhoneNumber", "LocationBranch", "BasicSalary", "GrossSalary",
    "Address", "Department", "Designation", "UserRole", "AccessLevel"
]

# Define the data rows (list of lists)
data = [
    ["Alice", "Smith", "asmith", "alice.smith@example.com", "password123", "555-111-2222", "North Branch", 55000.00, 68000.50, "10 North St, Anytown", "Engineering", "Software Developer", "Employee", "ReadWrite"],
    ["Bob", "Johnson", "bjohnson", "bob.j@test.org", "password123", "555-333-4444", "West Branch", 72000.00, 85000.00, "20 West Ave, Sometown", "Sales", "Sales Manager", "Manager", "Admin"],
    ["Charlie", "Davis", "cdavis", "charlie.davis@example.com", "password123", "555-555-6666", "Downtown Office", 48000.75, 59500.25, "30 Central Blvd, Anytown", "Support", "Support Specialist", "Employee", "User"],
    ["Diana", "Williams", "dwilliams", "diana.w@sample.net", "testpass", "555-999-0000", "South Office", 61000.00, 75000.00, "45 South Rd, Otherville", "Marketing", "Marketing Coord", "Employee", "ReadOnly"],
    ["Edward", "Miller", "emiller", "ed.miller@example.com", "password123", "555-888-7777", "North Branch", 90000.00, 110000.00, "12 North St, Anytown", "Engineering", "Lead Engineer", "Manager", "Admin"],
    ["Fiona", "Garcia", "fgarcia", "fiona.g@test.org", "securePwd", "", "West Branch", 52500.00, 64000.00, "25 West Ave, Sometown", "Support", "Tech Support Lv 1", "Employee", "User"],
    ["George", "Brown", "gbrown_test", "george.b@example.com", "password123", "555-123-9876", "Downtown Office", None, 71000.00, "33 Central Blvd, Anytown", "IT", "Systems Administrator", "Employee", "ReadWrite"],
    ["Alice", "Jones", "ajones", "alice.smith@example.com", "password123", "555-456-7890", "North Branch", 57000.00, 70000.00, "18 North St, Anytown", "Engineering", "QA Tester", "Employee", "ReadWrite"] # Duplicate email for testing
]

# Create a new Excel workbook and select the active sheet
wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Employees"

# Append the header row
ws.append(headers)

# Append the data rows
for row_data in data:
    # Ensure None values are written as empty cells, not the string "None"
    processed_row = [item if item is not None else "" for item in row_data]
    ws.append(processed_row)

# --- Optional: Adjust column widths for better readability ---
# This is approximate; Excel adjusts further on opening
for col_idx, column_cells in enumerate(ws.columns):
    max_length = 0
    column = openpyxl.utils.get_column_letter(col_idx + 1) # Get column letter

    # Find max length in this column
    for cell in column_cells:
        try:
            if cell.value:
                 cell_len = len(str(cell.value))
                 if cell_len > max_length:
                    max_length = cell_len
        except:
            pass

    # Add a little padding and set width
    adjusted_width = (max_length + 2)
    # Add constraints if needed (e.g., max width)
    # if adjusted_width > 50: adjusted_width = 50
    ws.column_dimensions[column].width = adjusted_width
# --- End Optional Width Adjustment ---


# Define the output filename
filename = "dummy_employee_data.xlsx"

# Save the workbook
try:
    wb.save(filename)
    print(f"Successfully created Excel file: '{filename}' in directory '{os.getcwd()}'")
except Exception as e:
    print(f"Error saving Excel file: {e}")