FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache git openssl

RUN npm install --quiet

COPY . .

EXPOSE 3002

CMD [ "npm", "run", "start" ] 