# Checklist de Aceitação (UAT) — Cognition AI

> Como usar: marque `[x]` em cada item testado. Se algo falhar, anote o problema na coluna de observações (ou abaixo do item) antes de marcar como ❌. Teste em desktop **e** mobile onde indicado. Teste também em modo claro e modo escuro.

---

## 1. Site público (visitante não logado)

### 1.1 Página inicial (`/`)
- [X] Carrega sem erro, hero e CTAs visíveis
- [X] Header mostra: Universidades, Calendário, Ajuda, Preços, Sou aluno, Entrar
- [ ] Hamburger mobile abre/fecha e todos os links funcionam
- [X] Rodapé com todos os links (Universidades, Calendário, Preços, Sou aluno, Sobre, Ajuda, Contato, Privacidade, Termos)
- [X] Lista de vestibulares disponíveis aparece corretamente
- [X] Modo escuro: todo texto legível, nenhum fundo/texto quebrado

### 1.2 Login (`/login`)
- [X] Formulário de login (professor/admin) funciona com credencial válida
- [X] Mensagem de erro clara com credencial inválida
- [X] Link "Esqueceu a senha?" funciona
- [X] Header/rodapé consistentes com o resto do site
- [X] Modo escuro ok

### 1.3 Sou aluno (`/aluno`)
- [X] Aba "Entrar" funciona com credencial válida de aluno
- [X] Aba "Criar conta": busca de escola funciona (autocomplete)
- [ ] Cadastro de escola nova (quando não encontrada na busca) funciona
- [X] Validações: senha mínima 6 caracteres, confirmação de senha, campos obrigatórios
- [X] Após cadastro, login automático e redirecionamento ao painel
- [X] Header/rodapé presentes, modo escuro ok

### 1.4 Universidades (`/universidades`)
- [ ] Lista carrega agrupada por tipo de instituição e por região
- [ ] Selo "Provas reais no banco" aparece só nas universidades corretas
- [ ] Clicar em uma universidade abre a página de detalhe correta
- [ ] Breadcrumb (Início > Universidades) presente

### 1.5 Página de universidade (`/universidades/:slug`)
- [ ] Conteúdo específico carrega (não a versão genérica) para pelo menos 5 universidades diferentes
- [ ] Breadcrumb (Início > Universidades > Nome) presente e funcional
- [ ] Link "Acessar site oficial" abre em nova aba
- [ ] FAQ e seção de cursos aparecem corretamente

### 1.6 Calendário de vestibulares (`/calendario`)
- [ ] Datas oficiais confirmadas aparecem com badge "Inscrição aberta" quando aplicável
- [ ] Estimativas por padrão histórico aparecem corretamente
- [ ] Links para universidades e sites oficiais funcionam

### 1.7 Outras páginas públicas
- [ ] Preços (`/plans`) — planos e valores exibidos corretamente
- [ ] Orçamento (`/quote`) — formulário envia e mostra confirmação
- [ ] Contato (`/contact`) — formulário envia e mostra confirmação
- [ ] Ajuda (`/ajuda`) — manuais e FAQ carregam
- [ ] Sobre (`/sobre`), Termos (`/termos`), Privacidade (`/privacidade`) — conteúdo carrega
- [ ] Todas têm header, footer e breadcrumb consistentes

---

## 2. Autenticação e conta

- [ ] Login de professor/admin funciona
- [ ] Login de aluno funciona
- [ ] Logout funciona e redireciona corretamente
- [ ] "Esqueci minha senha" envia e-mail de redefinição
- [ ] Link de redefinição de senha funciona e permite trocar a senha
- [ ] Convite por link (`/convite/:token`) — aceitar convite cria/vincula conta corretamente
- [ ] Sessão expira/token inválido redireciona para login sem travar a tela

---

## 3. Painel (área logada) — todos os perfis

- [ ] Dashboard carrega com dados corretos do usuário logado
- [ ] Sidebar mostra apenas os itens permitidos pro papel (admin/professor/aluno)
- [ ] Bloco "Recursos" na sidebar (Universidades, Calendário, Ajuda) funciona
- [ ] Hamburger/colapso da sidebar funciona no mobile e desktop
- [ ] Notificações (sino) abrem lista, marcam como lida, contagem atualiza
- [ ] Menu de perfil abre, "Perfil" e "Sair" funcionam
- [ ] Troca de tema claro/escuro funciona e persiste ao recarregar
- [ ] Nenhuma tela da área logada fica sem sidebar/topbar

---

## 4. Gestão de pessoas e turmas (admin/professor)

- [ ] Cadastrar professor (`/professors`) funciona
- [ ] Cadastrar aluno (`/students`) funciona
- [ ] Cadastrar matéria (`/subjects`) funciona
- [ ] Criar turma (`/classes`), vincular professor e alunos
- [ ] Editar e excluir pessoa/turma funciona sem quebrar vínculos existentes
- [ ] Configurações da escola (`/school`) salvam corretamente
- [ ] Controle de acesso por perfil (`/user-access`) restringe corretamente

---

## 5. Banco de questões e provas (professor)

- [ ] Criar questão objetiva (múltipla escolha) manualmente
- [ ] Criar questão verdadeiro/falso
- [ ] Criar questão dissertativa
- [ ] Gerador de questões por IA (a partir de texto/tópico) funciona
- [ ] Montar prova a partir do banco de questões
- [ ] Aplicar prova para uma turma
- [ ] Aluno responde a prova (`/exams/:id/submit`) — todos os tipos de questão funcionam
- [ ] Upload de prova escaneada (`/exams/:id/scan`) processa corretamente
- [ ] Correção manual de dissertativa funciona
- [ ] Correção assistida por IA gera nota e comentário coerente
- [ ] Resultado da prova (`/exams/:id/result`) exibe nota e feedback ao aluno
- [ ] Lista de envios (`/exams/:id/submissions`) mostra todos os alunos e status
- [ ] Análise/estatísticas da prova (`/exams/:id/analytics`) carrega gráficos corretos
- [ ] Página de correções pendentes (`/corrections`) lista o que falta corrigir

---

## 6. Simulados de vestibular (aluno)

- [ ] Dashboard de simulados (`/simulados/dashboard`) mostra progresso/histórico
- [ ] Iniciar simulado (`/simulados`) por tipo de vestibular funciona
- [ ] Responder simulado (`/simulados/:id`) — navegação entre questões, cronômetro (se houver)
- [ ] Ao final, nota e explicação por questão aparecem corretamente
- [ ] Banco específico de pelo menos 3 vestibulares testado (ex.: ENEM, ACAFE, UFPR, UFRGS, PUCPR, ITA)
- [ ] Refazer simulado gera novo conjunto de questões

---

## 7. Redações

- [ ] Aluno cria nova redação (`/redacoes/nova`)
- [ ] Lista de redações (`/redacoes`) mostra status (pendente/corrigida)
- [ ] Professor vê lista de redações da turma (`/redacoes/professor`)
- [ ] Correção de redação (`/redacoes/:id/review`) — nota e comentário por competência
- [ ] Aluno visualiza a correção em `/redacoes/:id`

---

## 8. Assinatura e uso (admin)

- [ ] Página de uso (`/usage`) mostra consumo de IA/créditos corretamente
- [ ] Assinatura (`/subscription`) mostra plano atual e permite upgrade
- [ ] Créditos de IA esgotados bloqueiam geração/correção por IA, mas não o resto do sistema

---

## 9. Área do proprietário (owner)

- [ ] `/billing` acessível só para papel "owner"; outros papéis são redirecionados
- [ ] Lista de escolas (`/owner/schools`) carrega e permite gestão
- [ ] Estatísticas (`/owner/stats`) carregam corretamente
- [ ] Painel de importadores (`/owner/importers`) mostra status real (não "para inglês ver") de cada importador

---

## 10. Navegação e usabilidade geral

- [ ] Nenhuma página pública fica sem header ou footer
- [ ] Breadcrumb presente em toda página de detalhe (universidade, prova, redação, calendário)
- [ ] De qualquer página pública é possível voltar à área logada com um clique ("Ir para o painel")
- [ ] De dentro do painel é possível chegar a Universidades/Calendário/Ajuda com um clique
- [ ] Nenhum link quebrado (404) nos menus principais
- [ ] Responsividade: testar pelo menos as 3 páginas mais usadas (dashboard, provas, simulados) em tela de celular

---

## 11. Anúncios (AdSense) e SEO

- [ ] Anúncios carregam nas páginas públicas sem quebrar layout
- [ ] Título da aba do navegador correto em pelo menos 5 páginas diferentes
- [ ] Compartilhar um link de universidade em rede social mostra preview correto (OG image/descrição)

---

## Resumo por prioridade

| Prioridade | Áreas |
|---|---|
| 🔴 Crítico (bloqueia lançamento) | Login/cadastro (seções 2, 1.2, 1.3), aplicar e corrigir prova (seção 5), simulados (seção 6) |
| 🟡 Importante | Navegação (seção 10), redações (seção 7), páginas públicas (seção 1) |
| 🟢 Desejável | Owner/estatísticas (seção 9), SEO/anúncios (seção 11) |

**Ambiente testado:** ______________ **Data:** ______________ **Testador:** ______________
