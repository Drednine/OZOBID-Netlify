FROM node:18-alpine

# Create app directory and set permissions
WORKDIR /app

# Install next.js globally
RUN npm install -g next

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy .npmrc for network settings
COPY .npmrc ./

# Install dependencies using npm install instead of npm ci
# Add flags to bypass strict checks and increase network timeouts
RUN npm install --no-audit --no-fund --legacy-peer-deps --fetch-retries=5 --fetch-retry-factor=2 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 --timeout=120000 --network-timeout=120000

# Copy the rest of the application
COPY . .

# Set correct permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
