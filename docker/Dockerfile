FROM node:20-alpine

# Set working directory
WORKDIR /app
RUN chown node:node /app

USER node

# Copy package metadata files
COPY --chown=node:node package.json package-lock.json* ./

# Install dependencies (runs automatically during docker build)
RUN npm install --production

# Copy application files (stateless static files and server)
COPY --chown=node:node . .

# Expose port 3000
EXPOSE 3000

# Start server.js directly
CMD ["node", "server.js"]

