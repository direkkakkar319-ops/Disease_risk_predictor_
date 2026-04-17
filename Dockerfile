FROM node:18-alpine

WORKDIR /app

# Install root-level packages
COPY package*.json ./
RUN npm install

# Install frontend-specific packages (tailwindcss, shadcn, etc.)
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
