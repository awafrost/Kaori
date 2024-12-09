# Étape 1 : Construction de l'application
FROM node:18 AS build

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier package.json et pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Installer les dépendances avec pnpm
RUN pnpm install

# Copier le reste du code source
COPY . .

# Compiler le code TypeScript
RUN npx tsc

# Étape 2 : Image d'exécution
FROM node:18

# Définir le répertoire de travail
WORKDIR /app

# Installer pnpm dans l'image d'exécution
RUN npm install -g pnpm

# Copier les fichiers nécessaires depuis l'étape build
COPY --from=build /app /app

# Exposer un port (ajustez selon votre besoin)
EXPOSE 3000

# Lancer le bot
CMD ["npm", "run", "start"]