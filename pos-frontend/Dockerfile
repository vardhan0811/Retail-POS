FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (to cache layer)
COPY package*.json ./
RUN npm ci

# Copy all source files and build
COPY . .
RUN npm run build

# Runtime container
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/pos-frontend /app/dist/pos-frontend

# Expose port and configure environment
EXPOSE 4200
ENV PORT=4200

# Run the SSR Express server
CMD ["node", "dist/pos-frontend/server/server.mjs"]
