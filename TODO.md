# TODO - Déploiement (Vercel + Render)

## Étapes
- [ ] 1) Vérifier local : `server` démarre (npm install + npm start)
- [ ] 2) Vérifier local : `frontend` build OK (npm install + npm run build)
- [ ] 3) Render: créer Web Service connecté au repo GitHub
- [ ] 4) Render: configurer Environment variables (NODE_ENV/PORT/JWT_SECRET/DATABASE_URL/FRONTEND_URL/SMTP)
- [ ] 5) Render: vérifier start command `npm start` et Working Directory = `server`
- [ ] 6) Render: lancer seed (`npm run seed`) une fois
- [ ] 7) Vercel: créer projet Next.js depuis le même repo
- [ ] 8) Vercel: configurer Build command (`npm run build`) + Root = `frontend`
- [ ] 9) Vercel: configurer `NEXT_PUBLIC_API_URL` vers l’URL du backend Render
- [ ] 10) Valider en prod : Network DevTools tests
  - [ ] 10a) POST /api/auth/login
  - [ ] 10b) GET /api/auth/me
- [ ] 11) Si échec : diagnostiquer CORS (FRONTEND_URL) vs JWT_SECRET vs endpoint 404

