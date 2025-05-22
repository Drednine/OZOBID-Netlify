FROM node:18-alpine AS builder

WORKDIR /app

# Create app directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

# Switch to non-root user
USER node

# Install dependencies
COPY --chown=node:node package.json package-lock.json ./
RUN npm install --production

# Copy source code
COPY --chown=node:node . .

# Build application
RUN npm run build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Create app directory and set permissions
RUN mkdir -p /app && chown -R node:node /app

# Switch to non-root user
USER node

# Copy necessary files from builder
COPY --chown=node:node --from=builder /app/package.json .
COPY --chown=node:node --from=builder /app/package-lock.json .
COPY --chown=node:node --from=builder /app/.next ./.next
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

EXPOSE 3000

CMD ["npm", "start"]
