# Étape 1 : Construction de l'application
FROM node:18 AS build

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm avec plus de détails pour déboguer
RUN npm install -g pnpm@8.15.4 --loglevel verbose

# Copier les fichiers de gestion des dépendances
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances avec pnpm
RUN pnpm install

# Copier le reste du code source
COPY . .

# Compiler le code TypeScript
RUN npx tsc

# Étape 2 : Image d'exécution
FROM node:18-slim

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm dans l'image d'exécution
RUN npm install -g pnpm@8.15.4 --loglevel verbose

# Copier les fichiers nécessaires depuis l'étape de build
COPY --from=build /app /app

# Installer uniquement les dépendances de production
RUN pnpm install --prod

# Copier le fichier .env
COPY .env ./

# Exposer un port
EXPOSE 3000

# Lancer le bot
CMD ["node", "dist/index.js"]
