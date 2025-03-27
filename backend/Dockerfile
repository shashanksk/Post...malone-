# ---- Build Stage ----
    FROM golang:1.24-alpine AS builder

    # Set necessary environment variables
    ENV CGO_ENABLED=0 GOOS=linux
    WORKDIR /app
    
    # Copy go.mod and go.sum first to leverage Docker cache
    COPY go.mod go.sum ./
    RUN go mod download
    
    # Copy the rest of the application source code
    COPY . .
    
    # Build the Go application
    # -ldflags="-w -s" strips debug information, reducing binary size
    RUN go build -ldflags="-w -s" -o /app/server .
    
    # ---- Runtime Stage ----
    FROM alpine:latest
    
    WORKDIR /app
    
    # Copy only the compiled binary from the builder stage
    COPY --from=builder /app/server /app/server
    
    # Copy .env file IF your Go app reads it directly at runtime
    # If using Compose env vars (recommended), you don't need this COPY
    # COPY .env .
    
    # Expose the port the backend runs on (defined in main.go or .env)
    EXPOSE 8080
    
    # Command to run the executable
    # The backend binary needs to be executable
    RUN chmod +x /app/server
    CMD ["/app/server"]
