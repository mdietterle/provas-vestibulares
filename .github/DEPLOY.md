# Pipeline de deploy

Este repositório já está preparado para publicar:

- Frontend em Vercel
- Backend em Render

## Secrets obrigatórios no GitHub

### Frontend - Vercel
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Backend - Render
- `RENDER_DEPLOY_HOOK_URL`

## Como configurar

1. Crie o projeto frontend no Vercel e copie:
   - `Project ID`
   - `Org ID`
   - `Vercel Token`

2. No projeto frontend do Vercel, use o diretório `frontend`.

3. No Render, crie o serviço do backend usando:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. No Render, gere um Deploy Hook e salve a URL no secret `RENDER_DEPLOY_HOOK_URL`.

5. No GitHub, vá em Settings → Secrets and variables → Actions e adicione os secrets listados acima.

## Fluxo de publicação

- Qualquer push na branch `master` com alteração em `frontend/**` dispara o deploy do frontend.
- Qualquer push na branch `master` com alteração em `backend/**` dispara o deploy do backend.

## Observações

- O frontend já aponta para o backend do Render em produção em [frontend/src/api/client.ts](frontend/src/api/client.ts).
- O backend já usa `uvicorn` e está pronto para o Render em [backend/Procfile](backend/Procfile).
