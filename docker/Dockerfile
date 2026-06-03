# Step 1: Use the official lightweight Node.js 20 image based on Alpine Linux.
# Alpine is selected to minimize image size and reduce the attack surface.
FROM node:20-alpine

# Upgrade system packages to patch base image vulnerabilities at build time.
# Must run as root before switching to the 'node' user.
RUN apk update && apk upgrade --no-cache

# Step 2: Set the working directory inside the container to /app.
# All subsequent instructions (RUN, COPY, CMD) will be executed in this folder.
WORKDIR /app

# Step 3: Change ownership of the /app directory to the built-in non-root 'node' user.
# This prevents permission issues when the container runs under a non-privileged account.
RUN chown node:node /app

# Step 4: Switch security context to the non-root 'node' user.
# Running the app as non-root is a standard security best practice (least privilege).
USER node

# Step 5: Copy package metadata files.
# The asterisk wildcard (*) in package-lock.json* ensures the build doesn't fail
# if the lockfile is missing (since the repository only tracks package.json).
# Files are copied with node:node ownership to match the running user.
COPY --chown=node:node package.json package-lock.json* ./

# Step 6: Install production dependencies.
# The --production flag skips devDependencies. (Note: Currently there are no external
# dependencies, but this keeps the Dockerfile future-proof).
RUN npm install --production

# Step 7: Copy the rest of the application source code.
# This includes the server logic, template stylesheets, and frontend files.
# Make sure to run the docker build with the repository root as the context:
#   docker build -f docker/Dockerfile .
COPY --chown=node:node . .

# Step 8: Expose port 3000 to tell Docker that the container listens on this port at runtime.
EXPOSE 3000

# Step 9: Define the command to start the web editor server directly.
CMD ["node", "server.js"]


