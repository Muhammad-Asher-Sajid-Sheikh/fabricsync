FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm timeout and registry settings to avoid ECONNRESET
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 10 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm install --loglevel verbose

# Copy Prisma schema and generate
COPY prisma ./prisma/
RUN npx prisma generate

# Copy rest of the code
COPY . .

EXPOSE 3000

CMD ["npm", "start"]