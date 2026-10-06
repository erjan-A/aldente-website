# aldenteai.com as a container: build the static site with Node, serve dist/ with nginx on port 80.
# Put it behind the server's HTTPS reverse proxy (see DEPLOY.md).
#
#   docker build -t aldente-website .
#   docker run -d --name aldente-website -p 8080:80 --restart unless-stopped aldente-website

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/snippets/ /etc/nginx/snippets/
COPY deploy/nginx/docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
