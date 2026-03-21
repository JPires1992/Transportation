FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install dependencies (bcrypt will be built for Linux)
RUN npm install --build-from-source

COPY . .

COPY entrypoint.sh /usr/local/bin/
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]

