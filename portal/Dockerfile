FROM node:20-alpine
WORKDIR /app

# Install deps first for better layer caching
COPY package.json ./
RUN npm install --omit=dev

COPY server.js ./
COPY public ./public

ENV PORTAL_PORT=3000
ENV PORTAL_DATA_DIR=/data
RUN mkdir -p /data
EXPOSE 3000

CMD ["node", "server.js"]
