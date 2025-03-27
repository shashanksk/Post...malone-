# ---- Build Stage ----
# Use a Node image to build the React app
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and lock file first for caching
COPY package*.json ./
# If using yarn: COPY yarn.lock ./
# If using pnpm: COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install
# If using yarn: RUN yarn install --frozen-lockfile
# If using pnpm: RUN pnpm install --frozen-lockfile

# Copy the rest of the frontend source code
COPY . .

# Build the React application for production
RUN npm run build

# ---- Serve Stage ----
# Use a lightweight Nginx image to serve the static files
FROM nginx:stable-alpine

# Copy the built static files from the builder stage to Nginx's default serve directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Default command for Nginx is to start the server
CMD ["nginx", "-g", "daemon off;"]