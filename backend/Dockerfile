FROM node:22-alpine 

WORKDIR /app 

# 1. Prevent Prisma from trying to download binaries during build if it struggles
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true 

# 2. Copy package files
COPY package*.json ./ 

# 3. Clean install
RUN npm ci --loglevel verbose 
RUN apk add --no-cache curl

# 4. Copy Prisma schema FIRST to leverage layer caching
COPY prisma ./prisma/ 
RUN npx prisma generate 

# 5. Fix: Properly copy the rest of your application code
COPY . . 

EXPOSE 3000 

# 6. Default command (Bypasses package.json index.js issues entirely)
CMD npx prisma db push && node src/app.js
