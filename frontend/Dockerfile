# Build stage
FROM node:18-bullseye-slim as build-stage

WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
# We embed the VITE_API_URL during build time for the proxy
ARG VITE_API_URL="http://localhost:3000/api"
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
