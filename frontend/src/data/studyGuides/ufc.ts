import type { StudyGuide } from '../studyGuideTypes'

export const guide: StudyGuide = {
  path: '/universidades/ufc/como-estudar',
  seoTitle: 'Como entrar na UFC: SiSU, média mínima de 450 e como se preparar | Cognition AI',
  seoDescription:
    'Guia para entrar na UFC: SiSU com a nota do ENEM, média mínima de 450, pesos iguais em todos os cursos, Sisu+, transferência, mudança de curso e como organizar o estudo.',
  badge: 'Ingresso pelo SiSU (nota do ENEM)',
  headline: 'Como entrar na UFC: SiSU, média mínima de 450 e como se preparar',
  intro:
    'A UFC preenche as vagas de graduação presencial pelo SiSU, com a nota do ENEM, e não publica programa de conteúdos por disciplina. Por isso este guia trata do que a universidade documenta oficialmente (requisitos de participação, média mínima, pesos no Termo de Adesão, cotas, lista de espera, Banco de Suplentes, Sisu+ e outras formas de ingresso) e de como usar essas regras para organizar o seu estudo. O documento oficial usado como base foi o',
  sourceLabel:
    'Edital nº 01/PROGRAD/REITORIA/UFC, de 16 de janeiro de 2026 (SiSU na UFC, edição 2026)',
  sourceUrl: 'https://sisu.ufc.br/wp-content/uploads/2026/01/edital-01-2026-ufc-cr-assinado.pdf',
  officialLabel: 'sisu.ufc.br',
  officialUrl: 'https://sisu.ufc.br/',
  ctaTitle: 'Treine para UFC',
  ctaText:
    'Monte simulados com questões no estilo e nível do ENEM, que é a prova que decide sua vaga na UFC pelo SiSU.',
  backTo: '/universidades/ufc',
  backLabel: 'Voltar para a página da UFC',
  breadcrumb: [
    { label: 'Início', to: '/' },
    { label: 'Universidades', to: '/universidades' },
    { label: 'UFC', to: '/universidades/ufc' },
    { label: 'Como estudar' },
  ],
  sections: [
    {
      id: 'ufc-selecao',
      title: 'Regras de participação e de seleção no SiSU da UFC',
      paragraphs: [
        'O edital 01/2026 determina que a seleção é feita exclusivamente com as notas do ENEM das edições 2023, 2024 ou 2025, e que o sistema usa, para cada candidato, a edição com a melhor média ponderada. Três condições valem para a edição ser considerada: você não pode ter participado como treineiro, a nota de redação precisa ser maior que zero e a média mínima no ENEM é de 450 pontos. A única exceção a essa média é o curso de Letras-Libras.',
        'A UFC ofereceu, pelo SiSU 2026, 6.408 vagas em 110 cursos de graduação presencial, em seis campi: Fortaleza, Sobral, Quixadá, Russas, Crateús e Itapajé. Desse total, 3.104 foram de ampla concorrência, 3.292 reservadas pela Lei 12.711/2012 e 12 por ação afirmativa própria. Segundo o Guia do Candidato da UFC, três cursos eram novidade no SiSU: Letras-Libras (que antes tinha seleção por outro sistema), a licenciatura em Teatro no campus de Itapajé e Inteligência Artificial no campus de Quixadá.',
        'A inscrição é gratuita, feita no Portal Único de Acesso ao Ensino Superior, com até duas opções de curso em ordem de preferência. Você não escolhe o semestre de ingresso: nos cursos com entrada nos dois semestres, a divisão depende da classificação final dos candidatos que solicitaram matrícula, e a UFC pode antecipar para o primeiro semestre quem estava no segundo se sobrarem vagas. Como nas demais instituições, quem concorre por cota disputa primeiro a ampla concorrência e só depois as vagas reservadas.',
        'Na matrícula, a etapa inicial é a solicitação de matrícula online pelo Portal do Candidato (envio de documentos, com chave de acesso enviada ao e-mail cadastrado no SiSU), seguida, conforme o caso, do vídeo de autodeclaração e da heteroidentificação para cotas de pretos e pardos (LB_PPI e LI_PPI), da comprovação presencial de deficiência com comissão multiprofissional e, por fim, da confirmação presencial na coordenação do curso. Quem não cumprir essas etapas perde a vaga, que pode ser repassada a suplentes.',
      ],
    },
    {
      id: 'ufc-pesos',
      title: 'Pesos e notas mínimas: na UFC, todas as provas valem o mesmo',
      paragraphs: [
        'Conferimos no Termo de Adesão da UFC ao SiSU 2026 (143 páginas) os pesos dos 110 cursos participantes e o padrão é uniforme: Redação, Linguagens, Ciências Humanas, Ciências da Natureza e Matemática têm peso 1 cada, com nota mínima de 0,01 em todas as provas (isto é, só a nota zero elimina) e média mínima de 450. Isso vale para Medicina, Direito, Engenharias, Ciência da Computação, Arquitetura, Letras e os demais cursos que conferimos. A única diferença encontrada foi Letras-Libras, cuja média mínima no Termo é 0,01.',
        'Com pesos iguais, o resultado é a média simples das cinco notas. Cada prova vale 20% da nota final, inclusive a redação. Essa é uma diferença importante em relação a universidades que dão peso 3 à redação ou peso maior a uma área específica: na UFC, o candidato de Medicina e o de Letras são comparados pela mesma régua, e o que separa um do outro é apenas a nota de corte de cada curso.',
      ],
      listTitle: 'Exemplos de vagas ofertadas no SiSU 2026 (Termo de Adesão)',
      list: [
        'Medicina: 160 vagas em Fortaleza e 80 em Sobral.',
        'Direito em Fortaleza: duas ofertas (uma noturna e outra integral) de 100 vagas cada, conforme o Termo.',
        'Engenharia Civil: 120 vagas em Fortaleza, 50 em Russas e 50 em Crateús.',
        'Ciência da Computação: 60 vagas em Fortaleza, 50 em Quixadá, 100 em Russas e 50 em Crateús.',
        'Odontologia: 80 vagas em Fortaleza e 44 em Sobral.',
        'Inteligência Artificial, novo em 2026: 50 vagas em Quixadá.',
      ],
    },
    {
      id: 'ufc-alternativas',
      title: 'Outras formas de ingressar na UFC',
      paragraphs: [
        'A página de Ingresso da Pró-Reitoria de Graduação lista modalidades além do SiSU regular. Nenhuma delas dispensa o ENEM quando o critério é a nota, e todas dependem de edital e de vagas disponíveis, então vale acompanhar o portal da Prograd e o sisu.ufc.br.',
      ],
      listTitle: 'Modalidades descritas nas páginas oficiais da UFC',
      list: [
        'Sisu+ 2026 (Edital 20/2026), etapa complementar do SiSU para o segundo semestre de 2026: só participa quem fez a etapa regular do SiSU 2026. As regras de nota são as mesmas (melhor média ponderada entre 2023, 2024 e 2025, redação maior que zero, média mínima de 450 e sem participação como treineiro, salvo exceção do INEP para quem obtém certificado de conclusão). Quem aprova aceita que não terá direito a vagas nas disciplinas do primeiro semestre do curso e deve procurar a coordenação para montar o plano de estudos. Inscrições previstas de 15 a 19 de junho de 2026.',
        'Lista de espera e Banco de Suplentes: após a chamada regular, o MEC gera a lista de espera entre quem manifestou interesse; a UFC explica que, para entrar no Banco de Suplentes, é preciso também enviar a documentação no período do edital de lista de espera, sem depender de ter manifestado interesse. As convocações seguem a ordem do banco e são divulgadas no sisu.ufc.br.',
        'Reposição de vagas: o edital 01/2026 prevê que, depois da última convocação de suplentes, a Coordenação do SISU poderá repor vagas ociosas por edital específico, com critérios próprios e independentes do SiSU.',
        'Admissão de graduado: para quem já tem diploma e quer um novo curso, depende de vagas e de processo seletivo com aproveitamento da nota do ENEM, conforme edital vigente.',
        'Mudança de curso (transferência interna): restrita a alunos da UFC que tenham cursado todos os componentes obrigatórios do primeiro ano do curso de origem, dependendo de vagas e de processo seletivo.',
        'Transferência de outras IES: pode ser obrigatória (ex officio, para servidor público federal ou dependente transferido por necessidade de serviço, independentemente de vaga) ou facultativa (depende de vagas e processo seletivo).',
        'Admissão por convênio: a UFC recebe estudantes estrangeiros da América Latina e da África por meio de um programa de intercâmbio cultural, para formação de recursos humanos em cooperação com países em desenvolvimento.',
        'Graduação semipresencial: o ingresso se dá por aproveitamento da nota do ENEM, com vagas e polos em edital próprio do Instituto UFC Virtual.',
        'Aluno especial: permitida a graduados ou a alunos de IFES fora da região metropolitana de Fortaleza que queiram cursar até 5 disciplinas isoladas; não é forma de entrar em um curso.',
      ],
    },
    {
      id: 'ufc-cotas',
      title: 'Cotas e ação afirmativa própria na UFC',
      paragraphs: [
        'A UFC reserva 50% das vagas do SiSU pela Lei de Cotas, e em todas as modalidades é obrigatório ter cursado o ensino médio integralmente em escola pública (ou em escolas comunitárias de educação do campo conveniadas). A UFC informa que não podem concorrer às cotas candidatos que cursaram parte do ensino médio em escola particular, mesmo com bolsa, nem quem estudou em escolas filantrópicas não comunitárias ou em escolas públicas no exterior. Certificados de ENEM, ENCCEJA e exames estaduais valem se emitidos por instituições públicas.',
        'As categorias do edital combinam renda de até 1 salário mínimo per capita (LB) ou sem limite de renda (LI) com autodeclaração de preto, pardo ou indígena (PPI), quilombola (Q), pessoa com deficiência (PCD) e escola pública (EP). Há ainda a ação afirmativa própria do curso de Letras-Libras, com a modalidade V1 para candidatos surdos que concluíram o ensino médio, nos termos do Decreto 5.626/2005: todos concorrem inicialmente à ampla concorrência e, quem for surdo e não entrar por ela, passa automaticamente às vagas V1.',
        'Quem se declara preto ou pardo grava um vídeo de autodeclaração de no máximo 60 segundos, com regras técnicas do Anexo III do edital (sem filtros, fundo neutro, sem óculos, boné ou maquiagem, mostrando o documento com foto), e pode ser convocado para heteroidentificação presencial. Preparar esse vídeo e os documentos com antecedência evita perda de vaga por indeferimento.',
      ],
    },
    {
      id: 'ufc-oferece',
      title: 'O que a UFC publica para quem vai prestar',
      paragraphs: [
        'O canal oficial é o portal sisu.ufc.br, que o edital define como meio oficial de comunicação com o candidato: a UFC não envia mensagens avulsas. Nele há o cronograma do SiSU, as chamadas, a lista de espera, as convocações do Banco de Suplentes, o resultado de matrícula, os remanejamentos, a página de Lei de Cotas, dúvidas frequentes por tema e a página de Editais e Legislação, com o Termo de Adesão completo.',
        'Dois materiais merecem atenção. O Guia do Candidato SiSU na UFC 2026 (PDF) explica o passo a passo da inscrição, da matrícula e da lista de espera. E a página de Notas de Corte reúne, em PDF, as notas de corte por curso de cada edição desde 2011, incluindo 2025, e o Guia informa que há um painel com a evolução das notas de cada curso. A própria UFC ressalta que a nota de corte é só uma referência e não garante resultado igual nas edições seguintes.',
        'Nas páginas consultadas não encontramos cursinho próprio nem guia de conteúdos por disciplina, e por isso não atribuímos nenhuma lista de assuntos à UFC.',
      ],
    },
    {
      id: 'ufc-dicas',
      title: 'Estratégia de estudo para um SiSU de pesos iguais e média mínima',
      paragraphs: [
        'Pesos iguais mudam a lógica de priorização. Como todas as provas valem 20%, o ponto mais fácil de ganhar é o que está na área onde você está mais longe da sua meta, e não na área do seu curso. Um estudante de Engenharia que está com 700 em Matemática e 500 em Linguagens ganha mais, por hora de estudo, investindo em Linguagens. Use os simulados para descobrir em qual das cinco provas o próximo ponto custa menos.',
        'A média mínima de 450 é o primeiro filtro e merece um plano de segurança: uma edição do ENEM só conta se a média das cinco notas chegar a 450, redação incluída. Quem está perto desse limite deve tratar o piso como meta intermediária, principalmente porque uma redação baixa puxa a média para baixo com o mesmo peso de qualquer outra prova. Na prática, redação zerada ou prova em branco pode tornar a edição inválida para a UFC.',
        'Como o SiSU usa a melhor média entre as edições 2023, 2024 e 2025, você não precisa se preocupar com perder uma edição ruim: a melhor será usada. Quem pretende refazer o ENEM deve lembrar que o treineiro não conta no SiSU da UFC, então confirme o seu status de participação na inscrição do exame.',
        'Olhe as notas de corte históricas do seu curso e campus, nos PDFs do sisu.ufc.br. Cursos concorridos de Fortaleza têm cortes muito mais altos do que cursos com vagas sobrando em campi do interior, o que dá margem para montar duas opções estratégicas, uma mais ousada e outra mais segura, já que são permitidas duas escolhas e a segunda é desconsiderada se você for aprovado na primeira.',
        'Por fim, prepare a parte burocrática junto com a acadêmica: a solicitação de matrícula tem prazo curto (em 2026, de 30 de janeiro a 3 de fevereiro), exige documentos como certificado de conclusão do ensino médio, identificação com foto, situação cadastral regular no CPF e, quando aplicável, quitação eleitoral e militar. Quem é cotista precisa de documentação adicional, e os documentos indeferidos podem ser regularizados em uma data única prevista no cronograma.',
      ],
    },
    {
      id: 'ufc-roteiro',
      title: 'Roteiro de estudo adaptado à UFC',
      ordered: true,
      listTitle: 'Passo a passo sugerido por nós, a partir das regras oficiais',
      list: [
        'Liste duas opções de curso e campus e registre, nos PDFs de notas de corte do sisu.ufc.br, os cortes dos últimos anos de cada uma.',
        'Faça um simulado completo e calcule a média simples das cinco notas, já que todos os pesos são 1; compare com 450 e com o corte do seu curso.',
        'Se a média estiver abaixo de 450, priorize as duas provas mais fracas e a redação até passar do piso; depois, reequilibre o tempo entre as cinco áreas.',
        'Escreva redações com regularidade: ela vale o mesmo que as demais provas, mas é a mais sensível a falhas de estrutura e a que mais derruba a média.',
        'Mantenha uma rotina de revisão por área, dedicando mais tempo à prova em que o ponto é mais barato, e acompanhe a evolução a cada simulado.',
        'Na semana das inscrições, monitore a nota de corte parcial que o SiSU divulga, ajuste a ordem das duas opções e deixe os documentos de matrícula digitalizados e conferidos pelo Anexo II do edital.',
        'Se não passar na chamada regular, manifeste interesse na lista de espera do MEC e envie a documentação à UFC para entrar no Banco de Suplentes, acompanhando também o Sisu+.',
      ],
    },
    {
      id: 'ufc-por-que-enem',
      title: 'Por que este guia aponta para o guia do ENEM',
      paragraphs: [
        'Segundo o edital 01/2026, a seleção para os cursos de graduação presenciais da UFC é feita exclusivamente com base nos resultados do ENEM, pelo SiSU. Não existe prova própria da UFC para esses cursos e a universidade não divulga programa de conteúdos por disciplina. Por isso este guia não repete listas de assuntos por matéria: o estudo por área é o do ENEM, que é a prova que define a sua nota.',
        'Como os pesos da UFC são iguais em todas as provas, todo o conteúdo do ENEM conta por igual, e o guia do ENEM é o caminho natural para montar o plano de estudo por área.',
      ],
      link: {
        to: '/universidades/enem/como-estudar',
        label: 'Ver o guia de estudos do ENEM, matéria por matéria',
      },
    },
    {
      id: 'ufc-fontes',
      title: 'Fontes oficiais',
      paragraphs: [
        'As informações acima foram conferidas nos documentos e páginas a seguir. Regras, datas e vagas mudam a cada edição, então confirme sempre a versão vigente antes de se inscrever.',
      ],
      sources: [
        { label: 'Edital nº 01/2026 (SiSU na UFC)', url: 'https://sisu.ufc.br/wp-content/uploads/2026/01/edital-01-2026-ufc-cr-assinado.pdf' },
        { label: 'Termo de Adesão da UFC ao SiSU 2026 (pesos, notas mínimas e vagas)', url: 'https://sisu.ufc.br/wp-content/uploads/2025/12/termo-de-adesao-ufc-sisu-2026.pdf' },
        { label: 'Editais e legislação do SiSU na UFC', url: 'https://sisu.ufc.br/pt/editais-e-legislacao-2026/' },
        { label: 'Guia do Candidato SiSU na UFC 2026', url: 'https://sisu.ufc.br/wp-content/uploads/2026/01/260129-guiasisu2026.pdf' },
        { label: 'Notas de corte por edição', url: 'https://sisu.ufc.br/pt/notas-de-corte-2/' },
        { label: 'Notas de corte SiSU UFC 2025 (PDF)', url: 'https://sisu.ufc.br/wp-content/uploads/2025/12/notas-de-corte-sisu-ufc-2025.pdf' },
        { label: 'Edital nº 20/2026 (Sisu+ 2026.2)', url: 'https://sisu.ufc.br/wp-content/uploads/2026/06/sei-6422398-edital-20-2026-edital-sisu-assinado.pdf' },
        { label: 'SiSU: o que é e como funciona (UFC)', url: 'https://sisu.ufc.br/pt/o-que-e-o-sisu-2026/' },
        { label: 'Lei de Cotas na UFC', url: 'https://sisu.ufc.br/pt/lei-de-cotas-2026/' },
        { label: 'Dúvidas frequentes do SiSU na UFC', url: 'https://sisu.ufc.br/pt/duvidas-frequentes-2026/' },
        { label: 'Ingresso na UFC (Pró-Reitoria de Graduação)', url: 'https://prograd.ufc.br/pt/ingresso-na-ufc/' },
        { label: 'Mudança de curso na UFC', url: 'https://prograd.ufc.br/pt/perguntas-frequentes/mudanca-de-curso/' },
        { label: 'Admissão de graduados na UFC', url: 'https://prograd.ufc.br/pt/perguntas-frequentes/admissao-de-graduados/' },
        { label: 'Transferência de outras IES para a UFC', url: 'https://prograd.ufc.br/pt/perguntas-frequentes/transferencia-de-outras-ies/' },
        { label: 'Portal Único de Acesso ao Ensino Superior (SiSU, MEC)', url: 'https://acessounico.mec.gov.br/sisu' },
      ],
    },
  ],
  subjects: [],
}
