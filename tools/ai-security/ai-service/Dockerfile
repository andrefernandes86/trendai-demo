FROM node:18-alpine

WORKDIR /app

# Install system dependencies for sharp
RUN apk add --no-cache vips-dev build-base python3

COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

EXPOSE 3004

CMD ["npm", "start"]
