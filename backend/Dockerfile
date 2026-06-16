FROM node:22-alpine

WORKDIR /app

# 1. Prevent Prisma from trying to download binaries during build if it struggles
# (It will look for the local architecture engine instead)
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# 2. Copy package files
COPY package*.json ./

# 3. Clean install without the bloated timeout configurations
RUN npm ci --loglevel verbose

# 4. Copy Prisma schema FIRST to leverage layer caching
COPY prisma ./prisma/
RUN npx prisma generate

# 5. Copy the rest of your application code
COPY . .

EXPOSE 3000

# 6. Default command (Make sure "start" exists in package.json!)
CMD ["npm", "start"]
