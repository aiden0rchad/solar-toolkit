# Stage 1: Build the React App
FROM node:22-alpine AS build

WORKDIR /app

# Copy package info and install dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the app code and build it
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx (Lightweight Web Server)
FROM nginx:alpine

# Copy the built files from Stage 1 to Nginx's serving folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80 (This is the port INSIDE the container)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]