# Checklist de Aceitação (UAT) — Cognition AI

> Como usar: marque `[x]` em cada item testado. Se algo falhar, anote o problema na coluna de observações (ou abaixo do item) antes de marcar como ❌. Teste em desktop **e** mobile onde indicado. Teste também em modo claro e modo escuro.
>
> **Atualizado em 11/09/2026** com os resultados da 2ª rodada de testes em https://cognition-ai-edu.vercel.app, agora cobrindo login com credenciais reais (admin, professor, aluno, owner) além dos itens públicos já testados. Itens marcados com ❌ falharam e têm observação logo abaixo. Itens ainda não testados (destrutivos, ou que dependem de dados que não temos) permanecem `[ ]` com o motivo.

---

## 1. Site público (visitante não logado)

### 1.1 Página inicial (`/`)
- [x] Carrega sem erro, hero e CTAs visíveis
- [x] Header mostra: Universidades, Calendário, Ajuda, Preços, Sou aluno, Entrar
- [x] Hamburger mobile abre/fecha e todos os links funcionam
- [x] Rodapé com todos os links (Universidades, Calendário, Preços, Sou aluno, Sobre, Ajuda, Contato, Privacidade, Termos)
- [x] Lista de vestibulares disponíveis aparece corretamente
- [ ] Modo escuro: todo texto legível, nenhum fundo/texto quebrado
  - ⚠️ Não há alternância de tema no site público (é sempre escuro), então o item como descrito não se aplica. Porém: ❌ há um bloco de anúncio (AdSense) vazio com **fundo branco sólido** logo antes do rodapé, quebrando o visual escuro do site.

### 1.2 Login (`/login`)
- [x] Formulário de login (professor/admin) funciona com credencial válida
  - ❌ **Bug confirmado:** login é sensível a maiúsculas/minúsculas no e-mail. A credencial fornecida `Conexao@conexao.com` (com C maiúsculo) falha com "Email ou senha incorretos"; a mesma credencial em minúsculas (`conexao@conexao.com`) funciona normalmente. O e-mail deveria ser tratado como case-insensitive no login.
- [x] Mensagem de erro clara com credencial inválida — toast "Email ou senha incorretos" aparece corretamente
- [ ] Link "Esqueceu a senha?" funciona
  - ❌ Ao clicar no link, nada acontece (a página não navega). O `href` está correto e a página `/esqueci-senha` funciona normalmente se acessada direto pela URL — o problema é só no clique.
- [x] Header/rodapé consistentes com o resto do site
- [ ] Modo escuro ok — não se aplica (sem toggle no site público)

### 1.3 Sou aluno (`/aluno`)
- [x] Aba "Entrar" funciona com credencial válida de aluno — login com `a@a.com` funcionou de primeira (e-mail já em minúsculas)
- [x] Aba "Criar conta": busca de escola funciona (autocomplete) — mostra "Nenhuma escola encontrada" corretamente
- [x] Cadastro de escola nova (quando não encontrada na busca) funciona — botão "Cadastrar '...' como nova escola" aparece
- [x] Validações: confirmação de senha, campos obrigatórios
  - ⚠️ A validação de "mínimo 6 caracteres" especificamente não foi confirmada (evitamos finalizar um cadastro real de teste) — vale checagem manual.
- [ ] Após cadastro, login automático e redirecionamento ao painel — não testado (evitamos criar conta real sem autorização)
- [x] Header/rodapé presentes, modo escuro ok

### 1.4 Universidades (`/universidades`)
- [x] Lista carrega agrupada por tipo de instituição e por região
- [x] Selo "Provas reais no banco" aparece só nas universidades corretas
- [x] Clicar em uma universidade abre a página de detalhe correta
- [x] Breadcrumb (Início > Universidades) presente

### 1.5 Página de universidade (`/universidades/:slug`)
- [x] Conteúdo específico carrega (não a versão genérica) para pelo menos 5 universidades diferentes — testado em ITA, UnB, FUVEST, ACAFE e UFPR
- [x] Breadcrumb (Início > Universidades > Nome) presente e funcional
- [x] Link "Acessar site oficial" abre em nova aba
- [x] FAQ e seção de cursos aparecem corretamente

### 1.6 Calendário de vestibulares (`/calendario`)
- [x] Datas oficiais confirmadas aparecem com badge "Inscrição aberta" quando aplicável
- [x] Estimativas por padrão histórico aparecem corretamente
- [x] Links para universidades e sites oficiais funcionam

### 1.7 Outras páginas públicas
- [x] Preços (`/plans`) — planos e valores exibidos corretamente
  - ❌ Porém expõe dados internos de custo/margem de lucro publicamente (ver observação na seção 11/resumo).
- [x] Orçamento (`/quote`) — formulário carrega e está completo
  - ⚠️ Envio não testado (submeter geraria um lead real) — confirme manualmente ou autorize o teste de envio.
- [x] Contato (`/contact`) — formulário carrega e está completo
  - ⚠️ Envio não testado pelo mesmo motivo acima.
- [x] Ajuda (`/ajuda`) — manuais e FAQ carregam
- [x] Sobre (`/sobre`), Termos (`/termos`), Privacidade (`/privacidade`) — conteúdo carrega
- [x] Todas têm header, footer e breadcrumb consistentes

---

## 2. Autenticação e conta
- [x] Login de professor/admin funciona — testado com professor (`c@c.com`) e admin (`conexao@conexao.com`, em minúsculas — ver bug 1.2)
- [x] Login de aluno funciona — testado com `a@a.com`
- [x] Logout funciona e redireciona corretamente — testado nas trocas de perfil (professor → aluno → owner)
- [x] "Esqueci minha senha" envia e-mail de redefinição
  - ⚠️ Testado só até o envio do formulário na página `/esqueci-senha` (o link do `/login` está quebrado — ver 1.2). Não confirmamos o recebimento real do e-mail.
- [ ] Link de redefinição de senha funciona e permite trocar a senha — não testado (depende de e-mail real)
- [ ] Convite por link (`/convite/:token`) — não testado (requer token válido)
- [ ] Sessão expira/token inválido redireciona para login sem travar a tela — não testado

## 3. Painel (área logada) — todos os perfis
- [x] Professor: dashboard carrega com estatísticas reais (questões criadas, provas criadas, tempo economizado, média da turma, % de correções IA da semana) e atalhos para Banco de Questões, Nova Prova, Painel de Correções e Turmas
- [x] Aluno: dashboard carrega com média geral, ranking entre colegas, % de conclusão das avaliações e gráfico de evolução das notas
- [x] Owner: dashboard de faturamento carrega com MRR, taxa de churn, retenção, instituições ativas, LTV médio, usuários totais e professores ativos
- [x] Navegação lateral consistente por perfil (Dashboard/Provas/Simulados/Redações para aluno; Dashboard/Turmas/Provas/Banco/Redações para professor)
- [x] RBAC (controle de acesso por papel): admin tentando acessar `/billing` (rota exclusiva do owner) é redirecionado de volta ao dashboard do admin — confirmado que perfis não acessam áreas de outros papéis

## 4. Gestão de pessoas e turmas (admin/professor)
- [x] Listagem de professores (`/professors`) carrega com filtros, busca e ações (Novo Professor, Gerenciar, Editar, ativar/inativar)
  - "Novo Professor" abre modal com campos Nome/Email/Senha/Acesso ao CAR corretamente
  - "Gerenciar" abre modal de atribuição de matérias com dados reais
- [ ] Editar e excluir pessoa/turma funciona sem quebrar vínculos existentes — não testado (ação destrutiva contra dados reais; peça autorização explícita antes de testar)
- [x] Gestão de turmas (`/classes`) e matérias (`/subjects`) carregam corretamente como admin
- [x] Página de acesso de usuários (`/user-access`) carrega

## 5. Banco de questões e provas (professor)
- [x] Banco de Questões (`/questions` via menu) lista 31 questões cadastradas, com filtros por tipo (M. Escolha, V/F, Dissertativa, Somatório) e dificuldade, e contadores corretos
- [x] Criar questão manualmente: modal "Nova Questão" oferece corretamente os 4 tipos (Múltipla Escolha, Verdadeiro/Falso, Dissertativa, Somatório), matéria, dificuldade, imagem opcional e toggle de questão pública
  - ⚠️ Bug de texto: o botão de submissão exibe "Gerador Questãoões" (nomes de UI duplicados, ex. "3 Questãoões" em vez de "3 Questões") — ver bug de texto abaixo.
- [x] Gerador de questões por IA ("Gerar com IA"): funciona corretamente — gera questão real e coerente a partir de matéria/tópico/dificuldade escolhidos (testado com Língua Portuguesa/Frações, retornou questão de matemática aplicada bem formulada)
  - ⚠️ O campo "Matéria" no gerador de IA só lista as matérias do próprio professor (correto/esperado), mas isso não fica claro na UI (parecia "bug" até confirmarmos que professor de português só vê "Língua Portuguesa" como opção)
  - ⚠️ Selecionar "1 questão" e clicar em gerar retornou 3 questões (quantidade preferida não respeitada nesse teste)
- [x] Montar prova: modal "Nova Prova" com abas "Prova Regular"/"Avaliação de Redação", título, instruções, matéria e turma — completo e funcional
- [x] Aplicar prova para turma / visualizar prova (`/exams/:id`): exibe matéria, turma, professor, pontuação total, enunciado da questão e área de resposta corretamente
- [x] Upload de prova escaneada: página do exame tem seção "Upload de Provas Digitalizadas" com drag-and-drop, aceita JPG/PNG/PDF até 20MB
- [x] Correção manual/assistida por IA: testado com submissão real de aluno — a IA transcreveu a resposta manuscrita corretamente (OCR de caligrafia), atribuiu nota por questão e gerou feedback textual específico sobre a resposta
- [x] Página de resultado (`/exams/:id/submissions`): lista alunos, status de entrega (Pendente/Corrigindo/Concluído/Liberado), nota e link para "Ver detalhes" com a resposta completa
- [x] Lista de envios/submissões funciona com filtros (Todos/Entregues/Não entregues)
- [x] Análise/estatísticas da prova (`Analytics`): média da turma, taxa de aprovação, distribuição de notas, desempenho por questão (taxa de erro) e até um alerta de "Cola" (respostas suspeitosamente similares entre alunos)
- [ ] Página de correções pendentes — não isolada como página própria; o fluxo observado usa a lista de submissões com filtro de status (comportamento aceitável, mas vale confirmar se existe uma tela dedicada)

## 6. Simulados de vestibular (aluno)
- [x] Dashboard de simulados (`/simulados` via menu "Simulados") lista dezenas de vestibulares organizados por região (Nacional, Sudeste, Sul, Centro-Oeste, Nordeste, Norte) — bem além do mínimo de 3 exigido
- [x] Iniciar simulado: modal de configuração (matéria, número de questões de 5 a 50) funciona e a IA gera as questões em poucos segundos
- [x] Responder / navegação entre questões: numeração de questões e barra de progresso funcionam corretamente
  - ❌ **Bug visual:** o indicador circular de cada alternativa (que deveria mostrar a letra da opção, ex. A/B/C/D) exibe literalmente o texto **"00"** em todas as alternativas de todas as questões testadas.
  - ❌ **Bug de conteúdo (IA):** pelo menos uma questão gerada (Física, simulado UNICENTRO) veio malformada — o enunciado misturava fragmentos de duas questões diferentes ("a) 0,333m b) 0,666m... 12- Um homem entrou numa loja...") e a 5ª alternativa de resposta veio **completamente vazia** (sem texto).
  - ❌ **Bug crítico:** ao clicar em "Entregar simulado" com as 5 questões respondidas, o envio falha de forma consistente e reprodutível — o console mostra respostas do servidor com erro **400 e 500**, e a tela permanece na última questão sem avançar para o resultado. Testado 2 vezes (com respostas diferentes na questão problemática), sempre falhou.
  - ❌ **Consequência:** como a plataforma permite apenas **um simulado por dia** por aluno, esse simulado falho ficou marcado como "em andamento" e bloqueou qualquer nova tentativa de simulado (inclusive de outro vestibular) pelo resto do dia com essa conta.
- [ ] Resultado com nota/explicação por questão — **não foi possível testar**: o envio do simulado nunca completa devido ao bug crítico acima.
- [ ] Refazer simulado — não testado (bloqueado pelo limite diário após a falha acima)
- [x] Banco específico de vestibulares: confirmado conteúdo específico por vestibular (ENEM, ITA, FUVEST, UNICENTRO e dezenas de outros, questões geradas por IA relacionadas à matéria escolhida)

## 7. Redações
- [x] Aluno: criar redação (`/redacoes` → "Nova Redação") — formulário com tema e texto, envio para correção por IA funciona muito bem
  - Testado com uma redação completa (~200 palavras) sobre mobilidade urbana: a IA corrigiu em segundos, retornando nota final, nota por cada uma das 5 competências (Competência temática, Coesão e coerência, Norma culta, Argumentação, Proposta de intervenção — modelo ENEM), com comentário específico por competência e feedback geral.
- [x] Aluno: ver lista de redações com status — mostra "Aguardando revisão" corretamente
- [x] Professor: ver lista de redações da turma (`/redacoes/professor`) — lista a redação do aluno com tema, data, status e nota da IA
  - [x] Estado vazio ("Nenhuma redação encontrada") também renderiza corretamente quando não há redações
- [x] Professor: corrigir com nota por competência — botão "Revisar" abre tela com o texto do aluno, feedback da IA, e os 5 critérios com nota e campo de observação editáveis individualmente, mais campo de comentário final visível ao aluno e botões "Recorrigir com IA" / "Salvar revisão"
- [ ] Aluno: visualizar a correção final do professor — não testado (não finalizamos a revisão do professor para não alterar a nota definitiva do registro de teste sem necessidade); o fluxo de exibição inicial da nota da IA ao aluno já foi confirmado (item 1)

## 8. Assinatura e uso (admin)
- [x] Página de uso (`/usage`) carrega — mostra plano atual (Basic), uso de IA zerado, bloqueios de recursos de IA
- [x] Página de assinatura (`/subscription`) carrega — mostra "Plano atual: Basic"
- ❌ **Bug de consistência de dados:** a página `/school` ("Configurações de IA") mostra um badge "Premium AI" com "3.200 geradas / 1.800 disponíveis / 64% utilizado", enquanto `/usage` e `/subscription` (para a mesma conta admin, no mesmo momento) mostram consistentemente plano "Basic" com uso de IA zerado. As três páginas deveriam refletir o mesmo estado de plano/uso e não o fazem. Reproduzido 2 vezes.
- [ ] Fluxo de upgrade/downgrade de plano — não testado (ação que pode gerar cobrança real; requer autorização explícita)

## 9. Área do proprietário (owner)
- [x] Dashboard de faturamento (`/billing`) carrega com métricas reais: MRR, taxa de churn, retenção, LTV médio, instituições ativas, usuários totais, professores ativos, tendência de 3 meses
- [x] Estatísticas globais (`/owner/stats`) carregam
- [x] Gestão de escolas (`/owner/schools`) carrega listando as instituições
- [x] Importadores (`/owner/importers`) carrega — seções de "Importação de Questões" (ENEM/INEP por ano) e "Importar prova ENEM (PDF ou URL do MEC)" com extração via IA
- [ ] Criar nova escola, inativar/excluir escola — não testado (ações destrutivas/irreversíveis contra dados reais de produção; peça autorização explícita antes de executar)
- [ ] Executar importação de questões via `/owner/importers` — não executado (a operação é descrita como idempotente mas ainda assim altera o banco de questões real; peça autorização antes de rodar)

---

## 10. Navegação e usabilidade geral
- [x] Nenhuma página pública fica sem header ou footer
  - ❌ Exceção: `/esqueci-senha` não tem header nem footer, e é a única página com fundo claro (destoa do resto do site, que é escuro).
- [x] Breadcrumb presente em toda página pública de detalhe testada (universidade, calendário)
- [x] De dentro do painel é possível chegar a Universidades/Calendário/Ajuda com um clique — confirmado no menu lateral do aluno (seção "Recursos")
- [x] Nenhum link quebrado (404) nos menus principais e páginas públicas testadas
- [x] RBAC/navegação entre perfis: logout e login com outro papel funcionam de forma limpa (localStorage/cookies), sem vazamento de sessão entre perfis
- [ ] Responsividade: dashboard, provas, simulados em tela de celular — não testado nesta rodada (testes logados foram feitos em viewport desktop/tablet); recomenda-se rodada dedicada de mobile para as áreas logadas

## 11. Anúncios (AdSense) e SEO
- [x] Anúncios carregam nas páginas públicas sem quebrar layout
  - ❌ Os blocos de anúncio aparecem como retângulos brancos vazios, sem conteúdo, quebrando o tema escuro do site em várias páginas.
- [x] Título da aba do navegador correto em pelo menos 5 páginas diferentes (testado em 14 páginas públicas)
- [ ] Compartilhar um link de universidade em rede social mostra preview correto (OG image/descrição)
  - ❌ O HTML retornado pelo servidor (o que crawlers do WhatsApp/Facebook/Twitter leem) mostra sempre o título, imagem e descrição genéricos da home, mesmo em páginas internas como `/universidades/ita`.

---

## Resumo por prioridade

| Prioridade | Áreas |
|---|---|
| 🔴 Crítico (bloqueia lançamento) | **Envio de simulado falha com erro 400/500 e trava o aluno pelo resto do dia (seção 6)**; dados de custo/margem expostos publicamente em `/plans` (seção 1.7); OG/title genéricos em todas as páginas internas, prejudicando SEO e compartilhamento (seção 11); dados de plano/uso de IA contraditórios entre `/school`, `/usage` e `/subscription` (seção 8) |
| 🟡 Importante | Login sensível a maiúsculas/minúsculas no e-mail (seção 1.2/2); indicador de alternativas mostrando "00" em vez da letra da opção nos simulados (seção 6); questão de simulado gerada pela IA com conteúdo malformado e alternativa vazia (seção 6); link "Esqueceu a senha?" quebrado; página `/esqueci-senha` sem header/footer e com fundo claro; anúncios quebrando layout; botão de `/plans` apontando para página interna |
| 🟢 Desejável | Texto duplicado "Questãoões" em botões do gerador de questões (seção 5); quantidade de questões geradas pela IA não respeita a seleção do professor; e-mail de contato com domínio antigo; FAQ desatualizado sobre recuperação de senha; slug de universidade da UnB pouco intuitivo |

**Ambiente testado:** https://cognition-ai-edu.vercel.app **Data:** 11/09/2026 **Testador:** Claude (a pedido de Martim) **Contas usadas:** admin/escola (`conexao@conexao.com`), professor (`c@c.com`), aluno (`a@a.com`), owner (`owner@cognition.com.br`)

### Bugs encontrados nesta rodada (detalhes completos)

**Novos nesta rodada (com login):**
1. 🔴 **Envio de simulado falha (erro 400/500).** Ao clicar "Entregar simulado" com todas as questões respondidas, a requisição ao servidor retorna erro 400 e 500 de forma consistente e reprodutível (testado 2x). O simulado nunca é finalizado, a nota/explicação por questão nunca aparece, e — como só é permitido 1 simulado por dia — o aluno fica bloqueado de tentar qualquer outro simulado pelo resto do dia. **Recomendo priorizar a correção deste bug antes do lançamento**, pois inutiliza uma das funcionalidades centrais do produto para o aluno.
2. 🔴 Dados de plano/uso de IA contraditórios entre páginas: `/school` mostra "Premium AI" com 3.200 questões geradas/1.800 disponíveis (64% utilizado), enquanto `/usage` e `/subscription` mostram consistentemente plano "Basic" com uso zerado, para a mesma conta e no mesmo momento.
3. 🟡 Login é case-sensitive no e-mail: a credencial fornecida com "C" maiúsculo (`Conexao@conexao.com`) falha; a mesma em minúsculas funciona. Isso pode gerar tickets de suporte desnecessários de usuários que digitam o e-mail com maiúsculas.
4. 🟡 Indicador de alternativas nos simulados mostra "00" ao invés da letra (A, B, C...) em 100% das questões testadas (5 de 5).
5. 🟡 Questão de simulado (Física, UNICENTRO) gerada pela IA veio malformada: enunciado parece ter absorvido fragmentos de outra questão, e a 5ª alternativa veio sem nenhum texto.
6. 🟢 Botão "Gerar X Questões" no gerador de IA do banco de questões exibe texto duplicado: "Gerar 3 Questãoões" (e variações), tanto no botão quanto no contador da página ("31 questãoões cadastradas" aparece brevemente durante o carregamento).
7. 🟢 Selecionar "1" no número de questões a gerar via IA nem sempre é respeitado — em um teste, gerou 3 questões mesmo com "1" selecionado.

**Já reportados na 1ª rodada (sem login), ainda válidos:**
8. 🔴 `/plans` expõe publicamente dados internos de custo e margem de lucro (ex.: "Margem: 60-68%").
9. 🔴 Title/OG tags não mudam por página no HTML servido a crawlers — previews de compartilhamento e SEO ficam genéricos em todo o site.
10. 🟡 Link "Esqueceu a senha?" em `/login` não navega ao clicar.
11. 🟡 Página `/esqueci-senha` sem header/footer e com fundo claro, quebrando a identidade visual do site.
12. 🟡 Blocos de anúncio (AdSense) aparecem como retângulos brancos vazios.
13. 🟡 Botão "Ver configurações da instituição" em `/plans` aponta para página interna/logada (`/school`).
14. 🟢 E-mail de contato exibido (`contato@aiassessmenthub.com.br`) não bate com a marca "Cognition AI".
15. 🟢 FAQ da Central de Ajuda desatualizado sobre o fluxo de recuperação de senha.
16. 🟢 Slug de universidade da UnB é `/universidades/cebraspe`, pouco intuitivo.

### O que funcionou muito bem (destaques positivos)
- Correção de prova via IA com OCR de resposta manuscrita (transcrição + nota + feedback específico) — funcionou perfeitamente no teste real.
- Correção de redação por IA no modelo das 5 competências do ENEM, com nota e comentário por competência — resultado rápido e bem estruturado.
- Painel de revisão do professor para redações, com ajuste de nota por critério e opção de recorrigir com IA.
- Analytics de prova (distribuição de notas, taxa de erro por questão, alerta de possível cola).
- Controle de acesso por papel (RBAC) funcionando corretamente entre admin/professor/aluno/owner.
- Geração de questões por IA (banco de questões) com conteúdo coerente e bem formulado.

### Pendente para a próxima rodada (requer decisão/autorização sua)
- Corrigir o bug crítico de envio de simulado (prioridade máxima) e então testar resultado/explicação por questão e "refazer simulado".
- Testar edição/exclusão real de pessoas, turmas e escolas (ações destrutivas) — só faremos mediante autorização explícita.
- Testar a execução real do importador de questões do ENEM em `/owner/importers` — só faremos mediante autorização explícita, pois altera o banco de questões de produção.
- Testar envio real dos formulários de Orçamento e Contato (gera lead real).
- Testar fluxo de upgrade/downgrade de assinatura (pode gerar cobrança).
- Rodada dedicada de responsividade mobile para as áreas logadas (dashboard, provas, simulados, redações).
