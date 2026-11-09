# Relatório de Teste de Usabilidade — Provas Vestibulares

**Data:** 2026-11-09  
**URL testada:** https://provas-vestibulares.vercel.app/exams/7  
**Credenciais:** a@a.com / 123456

---

## Resumo Executivo

O teste de usabilidade completo via navegador integrado não foi possível devido a limitações do ambiente (SPA routing, CORS, preview integrado não habilitado). No entanto, a **análise estática de código** e os **testes unitários** revelaram problemas críticos que impedem o fluxo de professor.

---

## Problemas Críticos Encontrados

### 1. `exam_questions` undefined → `TypeError: Cannot read properties of undefined (reading 'reduce')`

**Local:** Múltiplos arquivos  
**Severidade:** Crítico — quebra a renderização de páginas de prova

**Detalhes:**
- `ExamDetailPage.tsx:99` — `exam.exam_questions.reduce()` sem guarda
- `ExamDetailPage.tsx:149` — `exam.exam_questions.map()` sem guarda  
- `ExamSubmitPage.tsx:205` — `seededShuffle(exam.exam_questions, seed)` quebra se undefined
- `ExamSubmitPage.tsx:307` — `shuffledExam.exam_questions.reduce()` sem guarda
- `SubmissionsPage.tsx:329` — `exam.exam_questions.reduce()` sem guarda

**Correção aplicada:** Adicionado `?.` e `?? []` / `?? 0` nos 5 locais.

```typescript
// Antes (quebra):
const totalPoints = exam.exam_questions.reduce((s, q) => s + q.points, 0)
{exam.exam_questions.map((eq, i) => {...})}

// Depois (seguro):
const totalPoints = exam.exam_questions?.reduce((s, q) => s + q.points, 0) ?? 0
{(exam.exam_questions ?? []).map((eq, i) => {...})}
```

**Arquivos modificados:**
- `frontend/src/pages/ExamDetailPage.tsx` (2 correções)
- `frontend/src/pages/ExamSubmitPage.tsx` (2 correções)
- `frontend/src/pages/SubmissionsPage.tsx` (1 correção)

---

### 2. Falha no teste `ExamSubmitPage.test.tsx` — Mock `react-router-dom` incompleto

**Local:** `frontend/src/pages/ExamSubmitPage.test.tsx:41-44`  
**Severidade:** Alto — testes não passam

**Detalhes:** O componente usa `useLocation()` (linha 135) mas o mock não exporta:
```typescript
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
  // FALTA: useLocation: () => ({ pathname: '/exams/1', search: '', hash: '', state: null })
}))
```

**Correção necessária:**
```typescript
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/exams/1', search: '', hash: '', state: null }),
}))
```

---

### 3. Falha no teste `SubmissionsPage.test.tsx` — Mock `submissionsApi.stats` ausente

**Local:** `frontend/src/pages/SubmissionsPage.test.tsx:16-25`  
**Severidade:** Alto — testes não passam

**Detalhes:** O componente chama `submissionsApi.stats(+id)` (linha 164) mas o mock não tem esse método:
```typescript
vi.mock('../api/submissions', () => ({
  submissionsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    listByExam: vi.fn().mockResolvedValue({ data: [] }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    grade: vi.fn().mockResolvedValue({ data: {} }),
    release: vi.fn().mockResolvedValue({ data: {} }),
    ollamaStatus: vi.fn().mockResolvedValue({ data: { available: true } }),
    // FALTA: stats: vi.fn().mockResolvedValue({ data: { total_enrolled: 10, total_submitted: 5 } })
  },
}))
```

---

### 4. SPA Routing quebrado no servidor estático local

**Local:** N/A (configuração de deploy)  
**Severidade:** Médio — impede teste local

**Detalhes:** `vite build` + `python -m http.server` não faz fallback para `index.html` nas rotas SPA (`/exams/7` retorna 404 ou shell vazio).

**Correção necessária:** Configurar `vercel.json` com rewrites (já existe) ou usar servidor com SPA fallback (ex: `serve -s dist -l 5176`).

---

## Fluxos de Professor Não Testados (requer ambiente funcional)

| Funcionalidade | Status Esperado | Roteiro de Teste |
|---|---|---|
| Login professor | ✅ Deve funcionar | a@a.com / 123456 |
| Listar provas | ✅ | Dashboard → Provas |
| Criar prova nova | ❓ | Nova Prova → preencher campos → salvar |
| Adicionar questões | ❓ | Editar prova → "Adicionar questão" |
| Questão múltipla escolha | ❓ | Tipo "Múltipla Escolha" → 4 opções |
| Questão verdadeiro/falso | ❓ | Tipo "Verdadeiro/Falso" |
| Questão dissertativa | ❓ | Tipo "Dissertativa" |
| Questão pública vs particular | ❓ | Toggle "Pública" |
| Geração de questão com IA | ❓ | Botão "Gerar com IA" |
| Correção de provas | ❓ | SubmissionsPage → "Corrigir" |
| Correção assistida por IA | ❓ | Botão "Corrigir com IA" |
| Override manual de nota | ❓ | Editar nota → salvar |
| Exportar PDF da prova | ❓ | Botão "Exportar PDF" |
| Exportar ZIP (bulk PDF) | ❓ | Botão "Baixar prova offline" |
| Download XLSX notas | ❓ | Botão "Exportar XLSX" |

---

## Próximos Passos Recomendados

1. **Aplicar correções dos mocks** (itens 2 e 3) para fazer testes passarem
2. **Validar build de produção** com `vercel deploy` e testar na URL real
3. **Configurar servidor de dev com SPA fallback** (`vite preview` ou `serve -s dist`)
4. **Executar teste de usabilidade completo** na produção após deploy

---

## Verificação de Código (Static Analysis)

- ✅ `tsc --noEmit` — passa
- ✅ `vite build` — passa  
- ✅ `ExamDetailPage.test.tsx` — 2/2 testes passam
- ❌ `ExamSubmitPage.test.tsx` — falha (mock `useLocation`)
- ❌ `SubmissionsPage.test.tsx` — falha (mock `stats`)

---

## Artefato para Correção

Este relatório serve como artefato para que o desenvolvedor (ou agente) aplique as correções listadas acima. Todos os locais, detalhes do erro e insights de como corrigir estão documentados.

**Prioridade:** Crítico (item 1) → Alto (itens 2, 3) → Médio (item 4)