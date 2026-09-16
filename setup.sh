#!/bin/bash
set -e

echo "=== Sistema de Provas — Setup ==="

# Backend
echo ""
echo ">> Configurando backend..."
cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  Arquivo .env criado a partir do .env.example"
  echo "    Edite backend/.env com suas credenciais do Supabase antes de iniciar!"
  echo ""
fi

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Backend pronto"
deactivate
cd ..

# Frontend
echo ""
echo ">> Configurando frontend..."
cd frontend
npm install
echo "✅ Frontend pronto"
cd ..

echo ""
echo "=== Setup concluído! ==="
echo ""
echo "1. Configure o banco de dados:"
echo "   Edite backend/.env com a connection string do Supabase"
echo ""
echo "2. Para iniciar:"
echo "   Backend:  ./start-backend.sh"
echo "   Frontend: ./start-frontend.sh"
echo ""
echo "Acesso padrão criado automaticamente na primeira execução:"
echo "   Email: admin@escola.com"
echo "   Senha: admin123"
