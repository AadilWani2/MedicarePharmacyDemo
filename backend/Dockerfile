FROM node:20-slim

WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["npm", "start"]
