# Manual do Administrador — Plataforma de Avaliações

> Este guia cobre todas as funcionalidades exclusivas do perfil administrador: configuração da instituição, gestão de usuários, controle de acesso e monitoramento geral da plataforma.

---

## Sumário

1. [Login e Dashboard Administrativo](#1-login-e-dashboard-administrativo)
2. [Configurações da Instituição](#2-configurações-da-instituição)
3. [Gestão de Professores](#3-gestão-de-professores)
4. [Gestão de Alunos](#4-gestão-de-alunos)
5. [Matérias e Turmas](#5-matérias-e-turmas)
6. [Controle de Acesso](#6-controle-de-acesso)
7. [Monitoramento de Provas e Correções](#7-monitoramento-de-provas-e-correções)
8. [Banco de Questões UFPR e ACAFE](#8-banco-de-questões-ufpr-e-acafe)
9. [Configurações de IA](#9-configurações-de-ia)
10. [Análises e Relatórios](#10-análises-e-relatórios)
11. [Dúvidas Frequentes](#11-dúvidas-frequentes)

---

## 1. Login e Dashboard Administrativo

### Acesso

Acesse a plataforma com suas credenciais de administrador (e-mail e senha ou conta Google com permissão de admin).

### Dashboard Administrativo

O dashboard do administrador oferece visão completa da instituição:

| Seção | Descrição |
|---|---|
| **Cards de Métricas** | Totais de Professores, Alunos, Matérias, Turmas, Questões e Provas |
| **Gráfico de Crescimento** | Evolução mensal de usuários ou provas (6 ou 12 meses) |
| **Pipeline de Correções** | Status das submissões: Aguardando / Corrigindo / Corrigido / Liberado |
| **Correções IA em Tempo Real** | Progresso por turma das correções automáticas em andamento |
| **Provas por Matéria** | Distribuição de avaliações entre as disciplinas |
| **Atividade Recente** | Feed em tempo real das submissões mais recentes |
| **Questões por Dificuldade** | Distribuição do banco em Fácil / Médio / Difícil |
| **Acesso Rápido** | Atalhos para as principais áreas de gestão |

### Interpretando o Gráfico de Crescimento

- Use o toggle **Usuários / Provas** para alternar o dado exibido.
- Use o toggle **Semestral / Anual** para ajustar o período analisado.
- O indicador de porcentagem mostra a variação em relação ao mês anterior.

---

## 2. Configurações da Instituição

Acesse **"Configurações"** no menu lateral (ícone de engrenagem).

### O que você pode configurar

| Campo | Descrição |
|---|---|
| **Nome da Instituição** | Nome exibido em toda a plataforma |
| **Logotipo** | Upload da logo da escola/faculdade |
| **Domínio** | Domínio de e-mail autorizado para cadastro |
| **Configurações de IA** | Limite mensal de correções e geração por IA; toggle de sugestões automáticas |

### Configurações de IA

No card **"Configurações de IA"** da página de Configurações você pode:

- **Limite mensal de uso**: defina de 100 a 10.000 operações/mês pelo slider.
- **Sugestões automáticas**: ative ou desative as recomendações da IA para os alunos.
- O painel mostra consumo atual (geradas + disponíveis) com barra colorida de progresso.

> Salve sempre as alterações antes de sair da página de configurações.

---

## 3. Gestão de Professores

Acesse **"Professores"** no menu lateral.

### Cadastrar um novo professor

1. Clique em **"Novo Professor"**.
2. Preencha: **Nome completo**, **E-mail**, **Senha inicial**.
3. Clique em **Salvar**.
4. O professor receberá acesso com o perfil `professor`.

### Editar professor

1. Localize o professor na lista.
2. Clique no ícone de edição (lápis).
3. Altere os dados necessários e salve.

### Desativar professor

Para bloquear o acesso de um professor sem excluir seu histórico:
1. Localize o professor.
2. Clique em **"Desativar"** (ícone de bloqueio ou toggle de status).

> Professores desativados não conseguem fazer login, mas seus dados (questões, provas, correções) são preservados.

### Reativar professor

Siga o mesmo caminho e clique em **"Reativar"**.

---

## 4. Gestão de Alunos

Acesse **"Alunos"** no menu lateral.

### Cadastrar um novo aluno

1. Clique em **"Novo Aluno"**.
2. Preencha: **Nome completo**, **E-mail**, **Senha inicial**.
3. Opcionalmente, vincule a uma turma já existente.
4. Clique em **Salvar**.

### Importação em lote

Para cadastrar muitos alunos de uma vez, utilize a opção de importação via planilha (CSV), disponível no botão **"Importar"** na página de alunos. O arquivo deve conter as colunas: `nome`, `email`, `turma`.

### Gerenciar alunos

- **Editar**: altere nome, e-mail ou turma.
- **Desativar / Reativar**: controle o acesso do aluno à plataforma.
- **Ver resultados**: acesse o histórico de provas e notas de cada aluno.
- **Cadastrado em**: a coluna exibe a data de criação da conta de cada usuário.

---

## 5. Matérias e Turmas

### Matérias

Acesse **"Matérias"** no menu.

- **Criar matéria**: clique em "Nova Matéria", insira o nome e salve.
- **Editar / Excluir**: use os ícones na linha da matéria.

> Matérias vinculadas a provas existentes não podem ser excluídas sem antes remover ou reatribuir as provas.

### Turmas

Acesse **"Turmas"** no menu.

- **Criar turma**: informe nome (ex: "3º Ano A") e ano letivo.
- **Vincular professor a turma**: atribua professor e matéria na tela de edição da turma.
- **Vincular alunos**: adicione alunos individualmente ou por importação.

### Atribuições de ensino

Uma **atribuição de ensino** é a combinação Professor + Matéria + Turma. Ela define quem pode criar provas para qual turma e disciplina. Gerencie as atribuições na página de **Turmas** ou **Professores**.

---

## 6. Controle de Acesso

Acesse **"Controle de Acesso"** no menu lateral.

### Papéis disponíveis

| Papel | Permissões |
|---|---|
| **admin** | Acesso total à plataforma, incluindo configurações e gestão de usuários |
| **professor** | Criar questões, provas, corrigir e visualizar resultados das suas turmas |
| **student** | Realizar provas, simulados e visualizar seus próprios resultados |

### Alterar o papel de um usuário

1. Localize o usuário na lista.
2. Clique em **"Editar Acesso"**.
3. Selecione o novo papel.
4. Confirme a alteração.

> **Atenção:** Promover um aluno a professor ou administrador concede acesso imediato a funcionalidades restritas. Faça isso com cautela.

### Boas práticas de segurança

- Mantenha o número de administradores reduzido.
- Revise periodicamente a lista de usuários ativos.
- Desative imediatamente usuários que saírem da instituição.
- Use senhas fortes e incentive o uso de autenticação Google.

---

## 7. Monitoramento de Provas e Correções

### Pipeline de Correções

No dashboard, o card **"Pipeline de Correções"** exibe o status global de todas as submissões da instituição:

- **Aguardando**: aluno enviou, correção ainda não iniciada.
- **Corrigindo**: IA ou professor em processo de correção.
- **Corrigido**: correção finalizada, aguardando liberação pelo professor.
- **Liberado**: resultado visível para o aluno.

Clique em **"Ver todas →"** para acessar o painel completo de correções.

### Gerenciando provas de toda a instituição

Acesse **"Provas"** para visualizar e gerenciar todas as avaliações, independente do professor criador. Você pode:

- Filtrar por matéria, turma ou status.
- Acessar submissões de qualquer prova.
- Visualizar analytics de desempenho.

---

## 8. Banco de Questões UFPR e ACAFE

A plataforma inclui dois bancos de questões de vestibular pré-carregados que professores podem usar como base para criar provas personalizadas.

### UFPR (Universidade Federal do Paraná)

- Coletânea de questões dos vestibulares UFPR de **2010 a 2026**.
- Acessível pelo menu **"UFPR"** no painel do professor.
- Questões organizadas por **ano** e **área do conhecimento**.
- Suporte a questões com imagem (gabarito por OCR).

### ACAFE (Associação Catarinense das Fundações Educacionais)

- Banco de questões dos vestibulares ACAFE.
- Acessível pelo menu **"ACAFE"** no painel do professor.
- Questões com enunciado, alternativas, justificativa e matriz de referência.

### Importando para o banco da escola

1. O professor acessa o banco UFPR ou ACAFE.
2. Filtra por ano, área ou busca por palavra-chave.
3. Clica em **"Importar"** na questão desejada.
4. Seleciona a **matéria** de destino e a **dificuldade**.
5. A questão é copiada para o banco da escola e pode ser usada em provas.

> **Nota:** A importação cria uma cópia independente. Alterações na cópia não afetam o banco original.

---

## 9. Configurações de IA

A plataforma usa o modelo **Groq (qwen3-32b)** para correção automática e geração de questões.

### Limite de uso mensal

Configure o limite de operações de IA em **Configurações → Configurações de IA**. O painel exibe:

- **Geradas**: operações de geração de questões consumidas no mês.
- **Disponíveis**: saldo restante até o limite configurado.
- **Barra de progresso**: coloração muda conforme o consumo (verde → amarelo → vermelho).

### Sugestões automáticas para alunos

Quando ativado, a IA analisa o desempenho de cada aluno e exibe recomendações personalizadas no dashboard do aluno. Desative se preferir que os alunos não vejam essas sugestões.

---

## 10. Análises e Relatórios

### Gráfico de crescimento

No dashboard principal, monitore:
- Novos usuários cadastrados por mês.
- Novas provas criadas por mês.
- Tendência de crescimento mês a mês.

### Provas por matéria

O gráfico de barras no dashboard mostra quais matérias têm mais provas cadastradas, ajudando a identificar desbalanceamentos no currículo.

### Questões por dificuldade

O card de dificuldade mostra a proporção de questões Fácil/Médio/Difícil no banco da instituição. Use para garantir diversidade pedagógica.

### Analytics por prova

Para análises detalhadas de uma prova específica:
1. Acesse **"Provas"**.
2. Clique na prova desejada.
3. Clique em **"Analytics"**.

Você verá: média da turma, desempenho por questão, distribuição de notas e alunos que precisam de atenção.

---

## 11. Dúvidas Frequentes

**Como redefinir a senha de um usuário?**
Acesse **"Professores"** ou **"Alunos"**, localize o usuário, clique em editar e defina uma nova senha temporária. Informe o usuário para que ele altere no próximo login.

**Posso excluir uma turma que tem alunos?**
Para excluir uma turma, primeiro remova ou transfira os alunos vinculados. Turmas com provas associadas também não podem ser excluídas diretamente.

**Um professor não está visualizando uma turma. Por quê?**
Verifique se existe uma **Atribuição de Ensino** vinculando o professor à matéria e turma corretas. Sem essa atribuição, o professor não tem acesso.

**Como faço backup dos dados?**
A gestão de backup é responsabilidade da infraestrutura onde a plataforma está hospedada. Consulte o responsável técnico da sua instituição.

**A plataforma está lenta. O que verificar?**
- Verifique se há muitas provas sendo corrigidas simultaneamente pela IA.
- Confirme que o servidor backend está em execução.
- Contate o responsável técnico se o problema persistir.

**Como adicionar um segundo administrador?**
Cadastre o usuário normalmente (como professor ou aluno) e depois acesse **"Controle de Acesso"** para alterar seu papel para `admin`.

**O banco UFPR não aparece no menu. Por quê?**
O banco é habilitado automaticamente na primeira importação. Se não aparecer, verifique com o responsável técnico se o seed de questões foi executado corretamente.

---

*Suporte técnico ou dúvidas sobre infraestrutura? Contate o responsável técnico da plataforma.*
