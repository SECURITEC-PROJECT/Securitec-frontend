# Connexion au backend

Le navigateur appelle l'API du backend ; il ne se connecte jamais directement à PostgreSQL.

En local, le frontend utilise `http://localhost:5000/api` par défaut. Pour une mise en ligne :

1. Définir `VITE_API_URL` dans les variables d'environnement de compilation du frontend, avec l'URL publique du backend et le suffixe `/api` (par exemple `https://api.example.com/api`).
2. Définir `CORS_ORIGINS` sur le backend avec l'origine exacte du frontend, sans chemin (par exemple `https://app.example.com`).
3. Définir `DATABASE_URL` sur le backend avec l'URL de connexion Neon. Ne jamais mettre cette URL dans le frontend ni dans une variable `VITE_*`.
4. Redéployer le backend et reconstruire le frontend après modification des variables.

Vérifier la connexion avec `GET <VITE_API_URL>/health`, qui doit répondre avec `api: "ok"` et `database: "connected"`.
