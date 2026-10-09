import type { StudyGuide } from '../studyGuideTypes'

export const guide: StudyGuide = {
  path: '/universidades/ufba/como-estudar',
  seoTitle: 'Como entrar na UFBA: SiSU, pesos por curso e como se preparar | Prova Online',
  seoDescription:
    'Guia para entrar na UFBA: SiSU com a nota do ENEM, pesos e notas mínimas por curso no Termo de Adesão 2026, vagas residuais, transferência, Música e Teatro e como distribuir o estudo.',
  badge: 'Ingresso pelo SiSU (nota do ENEM)',
  headline: 'Como entrar na UFBA: SiSU, pesos por curso e como se preparar',
  intro:
    'A UFBA não tem vestibular próprio para a maioria dos cursos: a graduação é preenchida pelo SiSU, com a nota do ENEM, e a universidade não publica programa de conteúdos por disciplina. Por isso este guia trata do que a UFBA documenta oficialmente (regras de seleção, pesos e notas mínimas por curso, cotas, vagas residuais, transferência e os processos de Música e Teatro) e de como usar esses números para organizar o seu estudo. O documento oficial usado como base foi o',
  sourceLabel:
    'Edital 005/2026 da UFBA (Processo Seletivo para Ingresso nos Cursos de Graduação 2026)',
  sourceUrl:
    'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/edital_005_2026-_sisu_ufba_2026_assinado.pdf',
  officialLabel: 'ingresso.ufba.br',
  officialUrl: 'https://ingresso.ufba.br/',
  ctaTitle: 'Treine para UFBA',
  ctaText:
    'Monte simulados com questões no estilo e nível do ENEM, que é a prova que decide sua vaga na UFBA pelo SiSU.',
  backTo: '/universidades/ufba',
  backLabel: 'Voltar para a página da UFBA',
  breadcrumb: [
    { label: 'Início', to: '/' },
    { label: 'Universidades', to: '/universidades' },
    { label: 'UFBA', to: '/universidades/ufba' },
    { label: 'Como estudar' },
  ],
  sections: [
    {
      id: 'ufba-selecao',
      title: 'Como funciona a seleção pelo SiSU na UFBA',
      paragraphs: [
        'O edital 005/2026 informa que a UFBA selecionou os candidatos aos cursos de graduação presenciais exclusivamente pelos resultados do ENEM, por meio do SiSU, aceitando as edições de 2023, 2024 ou 2025. Pelo Termo de Adesão, a UFBA ofertou 5.991 vagas em 101 cursos participantes do SiSU, de um total de 130 cursos da instituição; os outros 29 cursos não entram no SiSU (entre eles licenciaturas semipresenciais e a distância e bacharelados de Música, que têm processos próprios). Dessas vagas, 2.754 foram de ampla concorrência e 3.237 reservadas pela Lei 12.711/2012.',
        'Os cursos se dividem em dois tipos. Nos Cursos de Progressão Linear (CPL), como Direito, Medicina e as engenharias, você entra direto no curso e segue um único percurso até o diploma. Nos Bacharelados Interdisciplinares (BI), como Artes, Ciência e Tecnologia, Humanidades e Saúde, a entrada é por uma formação geral de currículo flexível, que já dá diploma de bacharel e também pode levar a um CPL depois. Os campi participantes são Salvador, Anísio Teixeira (Vitória da Conquista) e Carlos Marighella (Camaçari).',
        'No SiSU você escolhe até duas opções de curso, em ordem de preferência, e indica a modalidade de concorrência. Quem se inscreve em cotas disputa primeiro as vagas de ampla concorrência e, só se a nota não bastar, passa a concorrer às vagas reservadas (item 4.4 do edital). Depois da chamada regular há a lista de espera: para entrar nela você precisa não ter sido aprovado em nenhuma opção e manifestar interesse em apenas uma das duas, no prazo do cronograma do MEC. Quem foi selecionado na chamada regular, mesmo sem se matricular, não participa da lista de espera da UFBA.',
        'Depois de aprovado, a matrícula é feita em duas frentes: envio online dos documentos (a UFBA publica um Manual do Candidato para essa etapa) e, conforme a modalidade, procedimento de heteroidentificação para candidatos pretos e pardos ou perícia médica para candidatos com deficiência. O edital prevê eliminação de quem não cumprir prazos de convocação, não comprovar a condição de cotista ou já tiver vínculo com outro curso de graduação público sem pedir desistência, em atenção à Lei 12.089/2009. Também é negada a participação de quem já se titulou na UFBA no mesmo curso.',
      ],
    },
    {
      id: 'ufba-pesos',
      title: 'Pesos e notas mínimas por curso (Termo de Adesão 2026)',
      paragraphs: [
        'O diferencial da UFBA para quem estuda é que cada curso aplica pesos próprios às cinco notas do ENEM, e eles ficam no Termo de Adesão ao SiSU 2026 (PDF de 128 páginas em ingresso.ufba.br). Conferimos os valores curso a curso nesse documento. A redação tem peso 3 em praticamente todos os cursos e, na grande maioria, nota mínima de 200 pontos, o que é eliminatório: quem tirar menos de 200 na redação fica fora do curso mesmo com as outras notas altas. As demais provas têm nota mínima de 0,01, isto é, só a nota zero elimina.',
        'Na prática, os cursos se organizam em poucos perfis de peso. A soma dos pesos é 15 na maior parte deles, então cada ponto de peso vale cerca de 6,7% da média; nos Bacharelados Interdisciplinares a soma é 12.',
      ],
      listTitle: 'Perfis de peso confirmados no Termo de Adesão (Redação sempre peso 3)',
      list: [
        'Exatas e engenharias (Engenharia Civil, Elétrica, Mecânica, Química, de Produção, Arquitetura e Urbanismo, Ciência da Computação, Sistemas de Informação, Estatística, Geologia, Geofísica, BIs e ABIs de Física, Matemática e Química): Linguagens 2, Humanas 2, Natureza 4, Matemática 4. Natureza e Matemática juntas pesam 8 de 15.',
        'Saúde e biológicas (Medicina em Salvador e em Vitória da Conquista, Odontologia, Enfermagem, Farmácia, Nutrição, Fisioterapia, Medicina Veterinária, Oceanografia, Biotecnologia, ABI Ciências Biológicas): Linguagens 3, Humanas 3, Natureza 4, Matemática 2. Ciências da Natureza é a prova de maior peso isolado.',
        'Humanas e sociais (Direito, Administração, Ciências Contábeis, Psicologia, Pedagogia, Serviço Social, Jornalismo, Educação Física, ABIs de História, Geografia, Filosofia e Ciências Sociais): Linguagens 4, Humanas 4, Natureza 2, Matemática 2.',
        'Letras (ABIs de Letras Vernáculas e de Língua Estrangeira): Linguagens 5, Humanas 3, Natureza 2, Matemática 2. É o perfil que mais valoriza Linguagens.',
        'Bacharelados Interdisciplinares de entrada (Artes, Ciência e Tecnologia, Humanidades e Saúde): Linguagens 2, Humanas 3, Natureza 2, Matemática 2, Redação 3, com soma 12, o que dá à redação um quarto da média.',
      ],
    },
    {
      id: 'ufba-oferta-vagas',
      title: 'Vagas em alguns dos cursos mais procurados',
      paragraphs: [
        'Para ter uma noção de escala, o Termo de Adesão lista, por exemplo: Medicina em Salvador com 80 vagas no SiSU, Medicina em Vitória da Conquista com 34, Direito em duas ofertas (101 e 136 vagas, em turnos diferentes), Odontologia com 87, Engenharia Civil com 142, Enfermagem com 76 e Farmácia em duas ofertas (110 e 35). Esses números valem para a edição 2026 e podem mudar a cada ano; o quadro oficial por curso, turno, semestre e modalidade está no Anexo Complementar I do edital e no próprio Termo de Adesão.',
        'Atenção a um detalhe do Termo: alguns cursos trazem a observação de que parte das vagas foi retirada para atender a processo seletivo próprio extraordinário. Confira sempre o número de vagas do curso e do turno que você quer, e não só o nome do curso.',
      ],
    },
    {
      id: 'ufba-alternativas',
      title: 'Outras formas de ingressar na UFBA',
      paragraphs: [
        'Além do SiSU, a página ingresso.ufba.br lista vários processos seletivos próprios. A UFBA informa, nas Dúvidas Frequentes, que realiza: SiSU, Odontologia, Música e Teatro, vagas supranumerárias (indígenas aldeados, quilombolas, pessoas trans, refugiados e servidores técnico-administrativos da UFBA), egressos de BI, vagas residuais, ensino a distância (EAD) e PARFOR Equidade. Conhecer essas portas ajuda a montar um plano B sem abandonar a preparação principal.',
      ],
      listTitle: 'O que cada processo prevê, segundo as páginas e editais oficiais',
      list: [
        'Vagas residuais 2026 (ingresso em 2027.1), Edital 06/2026, em quatro etapas sucessivas: transferência interna (aluno da UFBA que quer trocar de curso da mesma modalidade, BI para BI ou CPL para CPL), reintegração ao curso (ex-aluno com pelo menos dois semestres cursados), transferência externa (aluno de outra IES com no mínimo 25% da carga horária do curso de origem aprovada) e portador de diploma de nível superior. Em todas, a classificação usa nota do ENEM de qualquer edição a partir de 2009 com os pesos do curso pretendido (Anexo III). Taxas previstas no edital: R$ 80 para reintegração e transferência externa, R$ 170 para portador de diploma, e transferência interna isenta. As inscrições das etapas finais estão previstas para 21 a 26/10/2026 (transferência externa) e 30/11 a 04/12/2026 (diplomados), conforme o cronograma do Anexo II.',
        'Música e Teatro, Edital 004/2026: Teatro (Artes Cênicas: Direção Teatral e Interpretação Teatral) seleciona só pela nota do ENEM; os cursos da Escola de Música (Canto Lírico, Composição e Regência, Instrumento, Música Licenciatura e Música Popular) têm duas fases, ENEM e provas de habilidade específica, elaboradas e aplicadas pela Escola de Música. A inscrição é gratuita e o candidato escolhe uma única edição do ENEM (2023, 2024 ou 2025), sem misturar notas de edições diferentes.',
        'Vagas supranumerárias: exigem ensino médio concluído e ENEM de uma das edições aceitas (exceto refugiados), com comprovação da condição por documentos como declaração da FUNAI, certidão de autodefinição da Fundação Cultural Palmares, autodeclaração ou visto humanitário, conforme o caso.',
        'Egressos de BI: processo para quem concluiu um Bacharelado Interdisciplinar da UFBA e quer ingressar em um Curso de Progressão Linear, com edital próprio (Edital 02/2026), prova de títulos com barema e um Guia do Candidato BI-CPL aprovado por resolução.',
        'Cotas e ações afirmativas no SiSU: as modalidades do edital 005/2026 (A, AM, B, BM, BD, BMD, Q, QM e ampla concorrência) combinam escola pública, renda de até 1 salário mínimo per capita, autodeclaração como preto, pardo, indígena ou quilombola, e deficiência. Quem se declara preto ou pardo passa por banca de heteroidentificação; se não for confirmado mas tiver nota, entra na classificação da ampla concorrência, por decisão judicial citada no edital.',
      ],
    },
    {
      id: 'ufba-oferece',
      title: 'O que a UFBA publica para quem vai prestar',
      paragraphs: [
        'Nas páginas de ingresso que consultamos, a UFBA publica material de processo seletivo, não de conteúdo: edital, Termo de Adesão, quadro de vagas por modalidade, instruções de matrícula, procedimento de heteroidentificação, formulário de perícia médica e um Manual do Candidato com o passo a passo do envio de documentos online. Não encontramos, nessas páginas, cursinho próprio nem guia de conteúdos por disciplina, e por isso não atribuímos nenhuma lista de assuntos à universidade.',
        'Dois materiais ajudam a escolher o curso com mais segurança: o Catálogo de Cursos de Graduação da Pró-Reitoria de Ensino de Graduação e a Cartilha do Estudante. Para dúvidas sobre o processo, o edital indica a Coordenação de Seleção e Orientação (csor@ufba.br); para matrícula, matricula@ufba.br. O edital deixa claro que a UFBA não responde por telefone nem por mensagens não oficiais, então o acompanhamento deve ser feito no próprio site.',
      ],
    },
    {
      id: 'ufba-dicas',
      title: 'Como os pesos e a redação devem orientar o seu estudo',
      paragraphs: [
        'O ponto de partida é escolher o curso e ler o perfil de peso dele. Quem quer Medicina, Odontologia ou Enfermagem tem Ciências da Natureza como prova mais valiosa, mas Linguagens e Humanas somam 6 de 15 e a redação outros 3; ignorar Matemática (peso 2) também é ruim, porque ela entra na média como qualquer outra. Quem quer Direito ou Psicologia deve saber que Linguagens e Humanas pesam 8 de 15, contra 4 de Natureza e Matemática juntas. Quem mira engenharia ou computação concentra 8 de 15 em Natureza e Matemática.',
        'A redação merece atenção especial na UFBA por dois motivos. O primeiro é o peso: 20% da média na maioria dos cursos e 25% nos BIs de entrada. O segundo é a nota mínima de 200, que é eliminatória nos cursos conferidos. Fazer redações completas, com proposta de intervenção, e corrigi-las com critério é o investimento de tempo com retorno mais previsível, porque uma redação zerada ou muito baixa elimina a candidatura inteira.',
        'Outra consequência prática da regra de cotas: como o candidato cotista concorre primeiro na ampla concorrência, a nota de corte da ampla tende a ser a mais exigente, e o objetivo de estudo deve ser a nota do curso e da modalidade em que você vai se inscrever. Use as notas de corte divulgadas pelo SiSU durante a inscrição como termômetro, sem tratá-las como garantia de edições futuras.',
        'Como você pode usar notas de 2023, 2024 ou 2025, vale comparar as três e, se for refazer a prova, pensar no ENEM como uma chance de subir a nota nas áreas de maior peso do seu curso. Para Música, o estudo adicional é o das provas de habilidade específica, cujo conteúdo é definido pela Escola de Música em edital próprio.',
      ],
    },
    {
      id: 'ufba-roteiro',
      title: 'Roteiro de estudo adaptado à UFBA',
      ordered: true,
      listTitle: 'Passo a passo sugerido por nós, a partir das regras oficiais',
      list: [
        'Defina até duas opções de curso e anote, no Termo de Adesão, os pesos, a nota mínima de redação e o número de vagas de cada uma.',
        'Calcule a média ponderada de simulados com os pesos do seu curso, em vez da média simples, para saber de verdade como está em relação à meta.',
        'Distribua o tempo semanal de forma proporcional aos pesos: por exemplo, em um curso com perfil 4-4-2-2-3, reserve mais horas para Linguagens e Humanas, sem zerar Natureza e Matemática.',
        'Escreva uma redação por semana, priorizando atingir com folga os 200 pontos de corte antes de buscar notas altas.',
        'Nas últimas semanas, treine os dois dias de prova em sequência e revise erros por área, observando onde perder pontos custa mais na sua média ponderada.',
        'Na semana do SiSU, compare notas de corte parciais, reavalie a ordem das duas opções e deixe a documentação de matrícula organizada conforme o Anexo Complementar II.',
      ],
    },
    {
      id: 'ufba-por-que-enem',
      title: 'Por que este guia aponta para o guia do ENEM',
      paragraphs: [
        'Segundo o edital 005/2026, a seleção para os cursos de graduação presenciais da UFBA pelo SiSU é feita exclusivamente com base nos resultados do ENEM. Não há prova própria da UFBA para esses cursos e a universidade não divulga programa por disciplina, por isso este guia não traz lista de conteúdos por matéria: isso seria repetir o que já está no guia do ENEM, que é a prova que define a sua nota.',
        'A exceção oficial é a habilidade específica dos cursos de Música, aplicada pela Escola de Música em uma segunda fase, cujo programa é divulgado em edital próprio. Para todos os demais cursos do SiSU, o estudo por matéria é o do ENEM.',
      ],
      link: {
        to: '/universidades/enem/como-estudar',
        label: 'Ver o guia de estudos do ENEM, matéria por matéria',
      },
    },
    {
      id: 'ufba-fontes',
      title: 'Fontes oficiais',
      paragraphs: [
        'Todas as informações acima foram conferidas nos documentos e páginas abaixo. Regras, datas e vagas mudam a cada edição, então confirme sempre a versão vigente antes de se inscrever.',
      ],
      sources: [
        { label: 'Edital 005/2026 (SiSU UFBA 2026)', url: 'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/edital_005_2026-_sisu_ufba_2026_assinado.pdf' },
        { label: 'Termo de Adesão ao SiSU 2026 da UFBA (pesos, notas mínimas e vagas)', url: 'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/termo_adesao_sisu_ufba_2026.pdf' },
        { label: 'Página do SiSU 2026 na UFBA', url: 'https://ingresso.ufba.br/sisu-2026' },
        { label: 'Manual do Candidato: envio de documentos online', url: 'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/manual_do_candidato_sisu_-_2026_1.pdf' },
        { label: 'Vagas residuais 2026 (transferência, reintegração e diplomados)', url: 'https://ingresso.ufba.br/vagas-residuais-2026' },
        { label: 'Edital de vagas residuais 2026', url: 'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/edital_vr26_.pdf' },
        { label: 'Processo seletivo de Música e Teatro 2026', url: 'https://ingresso.ufba.br/musica-teatro-2026' },
        { label: 'Edital 004/2026 (Escolas de Música e de Teatro)', url: 'https://ingresso.ufba.br/sites/ingresso.ufba.br/files/edital_004-2026-_dos_cursos_de_musica_e_teatro.pdf' },
        { label: 'Vagas supranumerárias (indígenas aldeados, quilombolas, trans, refugiados e TAEs)', url: 'https://ingresso.ufba.br/aqtrt-2026' },
        { label: 'Egressos de BI para cursos de progressão linear', url: 'https://ingresso.ufba.br/egressos-bi-2026' },
        { label: 'Dúvidas frequentes do ingresso na UFBA', url: 'https://ingresso.ufba.br/duvidas-frequentes' },
        { label: 'Catálogo de Cursos de Graduação da UFBA', url: 'https://prograd.ufba.br/catalogo-de-cursos' },
        { label: 'Cartilha do Estudante da UFBA', url: 'https://prograd.ufba.br/cartilha-do-estudante' },
        { label: 'Portal Único de Acesso ao Ensino Superior (SiSU, MEC)', url: 'https://acessounico.mec.gov.br/sisu' },
      ],
    },
  ],
  subjects: [],
}
