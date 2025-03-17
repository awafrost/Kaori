# Étape 1 : Construction de l'application
FROM node:18 AS build

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm globalement
RUN npm install -g pnpm

# Copier les fichiers de gestion des dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances avec pnpm
RUN pnpm install

# Copier le reste du code source (inclut .env si présent)
COPY . .

# Compiler le code TypeScript
RUN npx tsc

# Étape 2 : Image d'exécution
FROM node:18-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm dans l'image d'exécution
RUN npm install -g pnpm

COPY --from=build /app /app

# Installer uniquement les dépendances de production
RUN pnpm install --prod

# Copier explicitement le fichier .env
COPY .env ./

# Exposer un port (ajustez selon votre besoin)
EXPOSE 3000

# Lancer le bot
CMD ["node", "dist/index.js"]
