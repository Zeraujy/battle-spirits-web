# Ranked Season 0 — configuração

## 1. Supabase
No SQL Editor, depois das migrações anteriores, execute:

`supabase/SOCIAL-HUB-3.7.0.sql`

## 2. Servidor Online
No ambiente onde `server/index.mjs` roda, configure:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

**Nunca** use a Service Role em `VITE_*`, no navegador ou em repositório público.

## 3. Fluxo Ranked
Conta autenticada → deck válido → servidor valida JWT → servidor lê RP → fila Ranked → pareamento → sala criada pelo servidor → resultado confirmado → servidor atualiza RP.

O Online Normal continua independente e não usa RP.
