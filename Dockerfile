FROM node:20-alpine

WORKDIR /app

# Install root-level packages
COPY package*.json ./
RUN npm install

# Install frontend-specific packages (tailwindcss, shadcn, etc.)
COPY frontend/package*.json ./frontend/
RUN npm install --prefix frontend

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--prefix", "frontend", "--", "--host", "0.0.0.0", "--port", "5173"]
