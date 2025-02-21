FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json .

RUN apk add --no-cache git

RUN npm install --quiet

COPY . .

RUN npx prisma migrate deploy

EXPOSE 3002

CMD [ "npm", "run", "start" ] 