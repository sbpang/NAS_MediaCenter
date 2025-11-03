FROM node:18-alpine as builder

WORKDIR /app

COPY package.json .
COPY package-lock.json* ./
RUN npm install

COPY . .

# Build-time environment variable (Vite embeds these at build time)
ARG VITE_API_BASE=http://media-api:1699
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config to handle API proxy if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

