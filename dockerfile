# 1. Use Node.js as the base
FROM node:18

# 2. Set a folder inside Docker
WORKDIR /app

# 3. Copy your important files first
COPY package*.json ./

# 4. Install your project dependencies
RUN npm install

# 5. Now copy everything else
COPY . .

# 6. Tell Docker which port your app uses
EXPOSE 5000

# 7. Start your app
CMD ["node", "server.js"]