FROM node:latest
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 80 8081
CMD ["node", "app.js"]
