FROM node:24-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package metadata and server entrypoint
COPY package.json package-lock.json* ./
COPY server.mjs ./

# Install production dependencies only (no http-server dependency needed)
RUN npm install --production

# Copy app sources
COPY . .

# Expose port for browser access
EXPOSE 8000

# Run the local server
CMD ["npm", "start"]
