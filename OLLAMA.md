# Configuração da IA de Correção Online (Groq API)

## Correção 100% Online

Toda a correção de avaliações, simulados e questões dissertativas da plataforma é realizada **100% online via API da Groq**, utilizando o modelo **`openai/gpt-oss-120b`**.

Modelos locais (Ollama / `llama3.2:3b` / `qwen2.5:7b`) e modelos legados foram descontinuados na plataforma.

---

## Modelo em Uso

- **Correção de Provas, Simulados e Redações (Texto):** `openai/gpt-oss-120b`
- **Leitura de Imagens / Scans de Gabarito (Visão):** `meta-llama/llama-4-scout-17b-16e-instruct`

---

## Configuração do Servidor (`backend/.env`)

Para ativar as correções por IA no ambiente, configure as seguintes variáveis no arquivo `backend/.env`:

```env
# Chave da API do Groq (obrigatória)
GROQ_API_KEY=gsk_...

# Modelo oficial online para textos e simulados
GROQ_MODEL=openai/gpt-oss-120b

# Modelo oficial online para visão / scans
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
```

---

## Verificação do Status da IA

Você pode verificar a disponibilidade da IA através da rota:

```http
GET /api/submissions/ai/status
```

Retorno esperado:

```json
{
  "available": true,
  "model": "openai/gpt-oss-120b",
  "message": "IA Online (openai/gpt-oss-120b) ativa"
}
```
