# Déploiement Option 1 : Vercel (frontend) + Render/Fly.io (backend)

## 1) Backend (Render/Fly.io)

### Variables d’environnement (Render)
À définir dans Render → Environment:
- `NODE_ENV=production`
- `PORT=8001` (ou le port imposé par la plateforme)
- `DATABASE_URL` = URL Postgres de Supabase (si vous voulez Supabase)
- `JWT_SECRET` = secret utilisé pour signer les tokens
- `FRONTEND_URL` = domaine Vercel (ex: https://your-vercel-app.vercel.app)
- `FRONTEND_URL_2` = optionnel (si besoin)
- Email (pour la confirmation) : `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`
- `GOOGLE_CLIENT_ID` si /api/auth/google est utilisé
- (optionnel) `ADMIN_EMAIL`, `ADMIN_PASSWORD` si vous voulez relancer le seed

### Commandes
- Build: (non nécessaire, Node pur)
- Start: `npm start`
- seed: lancer `npm run seed` au moins une fois (ou via un script/step de déploiement)

### Important
Le backend démarre et exécute automatiquement les “migrations” dans `server/src/db.js` (CREATE TABLE IF NOT EXISTS).
Donc avec Supabase Postgres, il suffit de fournir `DATABASE_URL`.

## 2) Frontend (Vercel)

### Build
- Next.js : `npm run build`
- Start (Vercel gère automatiquement)

### Variables d’environnement (Vercel)
- `NEXT_PUBLIC_API_URL` = URL publique du backend (Render/Fly.io) du type : `https://api-hopeveri.onrender.com`

### Côté CORS
Assurez-vous que le backend a `FRONTEND_URL` configuré avec le domaine Vercel.

## 3) Checklist Supabase
- Créer une base Supabase (Postgres)
- Récupérer `DATABASE_URL` (Connection string Postgres)
- Autoriser la connexion sortante depuis Render/Fly.io si nécessaire
- Vérifier que les tables `users` et `analyses` sont bien créées (elles le seront via le backend)

## 4) Variables locales
Copier `.env.example` vers `.env` et compléter.


