FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package metadata files
COPY package.json package-lock.json* ./

# Install dependencies (runs automatically during docker build)
RUN npm install --production

# Copy application files (stateless static files and server)
COPY . .

# Expose port 3000
EXPOSE 3000

# Start server.js directly
CMD ["node", "server.js"]
