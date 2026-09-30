// Guia de estudos do ENEM: conteúdos recorrentes por área, estrutura da prova
// e orientações de estudo. Textos próprios, com base em fontes públicas do Inep
// e em guias educacionais; links de estudo externos verificados na geração.

import type { GuideSection, StudySubject } from './studyGuideTypes'

export const ENEM_GUIDE_SECTIONS: GuideSection[] = [
  {
    "id": "estrutura",
    "title": "Como é a prova do ENEM",
    "paragraphs": [
      "O ENEM tem 180 questões objetivas de múltipla escolha, cada uma com cinco alternativas e uma única correta, mais uma redação. As questões se dividem igualmente entre quatro áreas, com 45 em cada: Linguagens, Códigos e suas Tecnologias; Ciências Humanas; Ciências da Natureza; e Matemática.",
      "A aplicação acontece em dois domingos seguidos, normalmente entre o fim de outubro e a primeira quinzena de novembro. No primeiro dia caem Linguagens, Ciências Humanas e a Redação, em cerca de 5 horas e 30 minutos. No segundo dia caem Ciências da Natureza e Matemática, em cerca de 5 horas. Não há tempo extra para quem não terminar, então treinar o ritmo faz parte do estudo.",
      "Na inscrição você escolhe a língua estrangeira, Inglês ou Espanhol. A prova traz questões das duas, mas você responde apenas às da língua escolhida. Datas, taxa e regras da edição atual estão na página do ENEM aqui no site e no portal oficial do Inep."
    ]
  },
  {
    "id": "cronograma",
    "title": "Como montar seu cronograma de estudos",
    "paragraphs": [
      "Um cronograma evita estudar só o que você gosta e deixar o resto para a última hora. Ele não precisa ser rígido: serve como mapa e deve ser ajustado conforme seu desempenho."
    ],
    "listTitle": "Passo a passo",
    "ordered": true,
    "list": [
      "Descubra seu ponto de partida fazendo uma prova anterior ou simulado logo no começo, sem consulta, e anote em que áreas você mais errou.",
      "Defina quantas horas por dia ou por semana você realmente consegue estudar, escolhendo os horários em que rende mais.",
      "Divida as semanas entre as quatro áreas e a redação, reservando mais tempo para as matérias em que você tem mais dificuldade.",
      "Alterne disciplinas teóricas e práticas no mesmo dia para manter a atenção, e inclua uma revisão semanal.",
      "Reserve dias fixos para resolver provas anteriores e fazer simulados completos, cronometrados.",
      "Fixe metas semanais por conteúdo, revise o que ficou para trás e reajuste o plano a cada duas ou três semanas com base no que os simulados mostram."
    ]
  },
  {
    "id": "sozinho",
    "title": "Como estudar para o ENEM por conta própria",
    "paragraphs": [
      "É possível ter um ótimo resultado sem cursinho, desde que haja método e constância. A vantagem de estudar sozinho é adaptar o ritmo: dá para gastar mais tempo no que pesa na sua nota e menos no que você já domina.",
      "Uma técnica eficiente é começar pelo exercício, e não pela teoria. No início da semana resolva um minissimulado de 10 a 15 questões de provas anteriores sobre os temas do período. Se acertou com segurança, pule a teoria desse tópico. Se errou ou chutou, vá direto à explicação do ponto exato que falhou. Assim a teoria entra como resposta a uma dúvida real, o que fixa melhor e economiza tempo."
    ],
    "listTitle": "Hábitos que ajudam quem estuda sozinho",
    "list": [
      "Deixe o celular fora do alcance durante os blocos de estudo, ou use um aplicativo de bloqueio de notificações.",
      "Prepare a mesa e o material do dia antes de começar; se a casa for barulhenta, use fones com ruído branco ou estude em uma biblioteca.",
      "Estude duas matérias por dia, alternando uma de exatas ou natureza com uma de humanas ou linguagens, para reduzir o cansaço mental.",
      "Se travar mais de uns 45 minutos no mesmo conceito, troque de matéria e volte no dia seguinte buscando outra explicação.",
      "Registre numa planilha o percentual de acerto por área a cada duas semanas para ver se o estudo está dando resultado.",
      "Uma vez por mês, reproduza o dia de prova em casa: cadeira comum, celular desligado, tempo marcado no relógio e só água e um lanche leve."
    ]
  },
  {
    "id": "redacao-guia",
    "title": "Redação do ENEM: competências e temas anteriores",
    "paragraphs": [
      "A redação é um texto dissertativo-argumentativo em norma culta, com nota de 0 a 1000. A correção avalia cinco competências, de 200 pontos cada: domínio da norma culta; compreensão da proposta e uso de conhecimentos de diferentes áreas dentro da estrutura dissertativa; seleção, organização e interpretação de informações em defesa de um ponto de vista; conhecimento dos mecanismos de coesão; e elaboração de uma proposta de intervenção que respeite os direitos humanos.",
      "Conhecer os temas anteriores ajuda a perceber o perfil da prova: desde 2009 eles tratam de problemas sociais, culturais, políticos ou ambientais do Brasil. Não adianta decorar temas, mas treinar escrevendo sobre eles é uma ótima forma de montar repertório."
    ],
    "listTitle": "Temas de redação das últimas edições",
    "list": [
      "2025: Perspectivas acerca do envelhecimento na sociedade brasileira",
      "2024: Desafios para a valorização da herança africana no Brasil",
      "2023: Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
      "2022: Desafios para a valorização de comunidades e povos tradicionais no Brasil",
      "2021: Invisibilidade e registro civil: garantia de acesso à cidadania no Brasil",
      "2020: O estigma associado às doenças mentais na sociedade brasileira",
      "2019: Democratização do acesso ao cinema no Brasil",
      "2018: Manipulação do comportamento do usuário pelo uso de dados na internet",
      "2017: Desafios para a formação educacional de surdos no Brasil",
      "2016: Caminhos para combater a intolerância religiosa no Brasil"
    ]
  },
  {
    "id": "recursos",
    "title": "Recursos gratuitos para treinar",
    "paragraphs": [
      "Provas anteriores são o melhor material: mostram o estilo das questões, a forma como o conteúdo é cobrado e o nível de dificuldade. Faça-as com o tempo marcado e analise cada erro."
    ],
    "topics": [
      {
        "id": "enem-rec-1",
        "title": "Provas e gabaritos de edições anteriores",
        "summary": "O Inep disponibiliza as provas e os gabaritos oficiais de todas as edições. Prefira as mais recentes, que refletem melhor o formato atual.",
        "links": [
          {
            "label": "Inep — Provas e gabaritos do Enem 2025",
            "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025"
          },
          {
            "label": "Inep — Provas e gabaritos do Enem",
            "url": "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
          }
        ]
      },
      {
        "id": "enem-rec-2",
        "title": "Bancos de questões e simulados",
        "summary": "Plataformas gratuitas para praticar por área e assunto e acompanhar o desempenho ao longo dos meses.",
        "links": [
          {
            "label": "Descomplica — Simulado Enem grátis",
            "url": "https://descomplica.com.br/tudo-sobre-enem/novidades/simulado-enem/"
          },
          {
            "label": "CNN Brasil — Simulados gratuitos para treinar",
            "url": "https://www.cnnbrasil.com.br/educacao/enem-2024-confira-4-simulados-gratuitos-para-treinar/"
          }
        ]
      }
    ]
  }
]

export const ENEM_STUDY_GUIDE: StudySubject[] = [
  {
    "id": "portugues",
    "name": "Língua Portuguesa",
    "group": "Linguagens, Códigos e suas Tecnologias",
    "intro": "Leitura e interpretação são a base de quase todas as provas do ENEM, inclusive as de outras áreas. Quem lê bem ganha pontos em Humanas, Natureza e até em Matemática.",
    "orientacoes": [
      "Leia todos os dias textos de tipos diferentes: notícias, artigos de opinião, crônicas, tirinhas e propagandas.",
      "Ao terminar um texto, tente resumir a ideia central em uma frase e dizer qual é a intenção do autor.",
      "Estude gramática dentro de textos: observe como pontuação, concordância e escolha de palavras mudam o sentido.",
      "Treine ler o enunciado com calma; muitos erros vêm de responder o que não foi perguntado.",
      "Resolva questões de provas anteriores e escreva por que cada alternativa errada está errada."
    ],
    "topics": [
      {
        "id": "enem-por-1",
        "title": "Interpretação de textos",
        "summary": "Textos narrativos, argumentativos e injuntivos: ideia central, informações implícitas, intenção do autor e relação entre texto e contexto.",
        "links": [
          {
            "label": "Descomplica — Como aprender interpretação de texto para o Enem",
            "url": "https://descomplica.com.br/blog/como-aprender-interpretacao-de-texto/"
          },
          {
            "label": "Aprova Total — Interpretação de texto no Enem: 5 dicas",
            "url": "https://aprovatotal.com.br/interpretacao-de-texto-enem-dicas/"
          }
        ]
      },
      {
        "id": "enem-por-2",
        "title": "Gêneros textuais",
        "summary": "Carta, artigo, crônica, notícia, propaganda e outros gêneros, com suas finalidades, linguagem e formas de circulação.",
        "links": [
          {
            "label": "Toda Matéria — Gêneros textuais",
            "url": "https://www.todamateria.com.br/generos-textuais/"
          },
          {
            "label": "PrePara Enem — Gêneros textuais no Enem",
            "url": "https://www.preparaenem.com/enem/generos-textuais-no-enem.htm"
          }
        ]
      },
      {
        "id": "enem-por-3",
        "title": "Gramática em uso",
        "summary": "Ortografia, acentuação, pontuação, concordância verbal e nominal, regência e crase, sempre relacionadas ao efeito no texto.",
        "links": [
          {
            "label": "Estuda Enem — Regência e crase",
            "url": "https://estudaenem.blog/2026/08/12/regencia-e-crase-regras-exemplos-e-exercicios-para-o-enem/"
          },
          {
            "label": "Toda Matéria — Crase",
            "url": "https://www.todamateria.com.br/crase/"
          }
        ]
      },
      {
        "id": "enem-por-4",
        "title": "Semântica",
        "summary": "Sinonímia, antonímia, polissemia, ambiguidade e diferença entre sentido denotativo e conotativo.",
        "links": [
          {
            "label": "Toda Matéria — Semântica",
            "url": "https://www.todamateria.com.br/semantica/"
          }
        ]
      }
    ]
  },
  {
    "id": "literatura",
    "name": "Literatura",
    "group": "Linguagens, Códigos e suas Tecnologias",
    "intro": "A prova costuma cobrar a leitura de um trecho literário e a relação dele com o período e com as ideias de sua época, mais do que datas e nomes soltos.",
    "orientacoes": [
      "Estude cada movimento pelas ideias e pelo contexto histórico, e só depois pelos autores.",
      "Leia trechos de obras representativas de cada período para reconhecer o estilo de cada época.",
      "Monte um quadro comparando movimentos: contexto, temas, linguagem e autores.",
      "Relacione a literatura com a história do Brasil, pois muitas questões cruzam as duas áreas."
    ],
    "topics": [
      {
        "id": "enem-lit-1",
        "title": "Movimentos literários brasileiros",
        "summary": "Barroco, Arcadismo, Romantismo, Realismo, Naturalismo e Modernismo, com suas características e contexto histórico.",
        "links": [
          {
            "label": "Toda Matéria — Movimentos literários",
            "url": "https://www.todamateria.com.br/movimentos-literarios/"
          },
          {
            "label": "Estuda Enem — Movimentos literários brasileiros",
            "url": "https://estudaenem.blog/2025/10/16/movimentos-literarios-brasileiros-da-literatura-colonial-ao-modernismo-no-enem/"
          }
        ]
      },
      {
        "id": "enem-lit-2",
        "title": "Autores e obras representativos",
        "summary": "Principais escritores e obras de cada período e o que cada um representa dentro do movimento.",
        "links": [
          {
            "label": "Toda Matéria — Escolas literárias",
            "url": "https://www.todamateria.com.br/escolas-literarias/"
          },
          {
            "label": "Educa Mais Brasil — Escolas literárias",
            "url": "https://www.educamaisbrasil.com.br/enem/lingua-portuguesa/escolas-literarias"
          }
        ]
      },
      {
        "id": "enem-lit-3",
        "title": "Temas recorrentes",
        "summary": "Assuntos que voltam ao longo da literatura brasileira, como identidade nacional, desigualdade, amor, natureza e crítica social.",
        "links": [
          {
            "label": "Toda Matéria — Literatura brasileira",
            "url": "https://www.todamateria.com.br/origens-da-literatura-brasileira/"
          },
          {
            "label": "Aprova Total — Literatura no Enem",
            "url": "https://aprovatotal.com.br/literatura-enem/"
          }
        ]
      }
    ]
  },
  {
    "id": "lingua-estrangeira",
    "name": "Língua Estrangeira (Inglês ou Espanhol)",
    "group": "Linguagens, Códigos e suas Tecnologias",
    "intro": "A prova é de leitura e interpretação. Não exige falar nem escrever, mas exige vocabulário e prática, que não se constroem em poucos dias.",
    "orientacoes": [
      "Comece cedo e leia um pouco todo dia, mesmo que sejam textos curtos.",
      "Use palavras conhecidas, cognatos e o contexto para deduzir o sentido antes de procurar no dicionário.",
      "Em Espanhol, atenção aos falsos cognatos, palavras parecidas com o português mas de sentido diferente.",
      "Escolha a língua com a qual você tem mais familiaridade; a escolha é feita na inscrição."
    ],
    "topics": [
      {
        "id": "enem-le-1",
        "title": "Inglês: compreensão de textos",
        "summary": "Leitura de notícias, propagandas, tirinhas e textos curtos, identificando tema, informações e finalidade.",
        "links": [
          {
            "label": "Descomplica — Como ler inglês no ENEM sem traduzir",
            "url": "https://descomplica.com.br/blog/pare-de-traduzir-leia-ingles-no-enem-e-gabarite-2/"
          },
          {
            "label": "Descomplica — Contraste no texto",
            "url": "https://descomplica.com.br/blog/contraste-no-texto-arma-secreta-entender-ingles-enem-2/"
          }
        ]
      },
      {
        "id": "enem-le-2",
        "title": "Espanhol: compreensão de textos",
        "summary": "Mesma habilidade de leitura, com cuidado com os falsos cognatos e com expressões próprias da língua.",
        "links": [
          {
            "label": "Toda Matéria — Compreensão e interpretação de textos em espanhol",
            "url": "https://www.todamateria.com.br/compreensao-e-interpretacao-de-textos-em-espanhol/"
          },
          {
            "label": "Estuda.com — Espanhol no Enem",
            "url": "https://estuda.com/espanhol-enem/"
          }
        ]
      },
      {
        "id": "enem-le-3",
        "title": "Vocabulário, inferência e intenção do autor",
        "summary": "Expressões usuais, dedução do sentido pelo contexto e reconhecimento do posicionamento de quem escreve.",
        "links": [
          {
            "label": "Toda Matéria — Falsos cognatos em inglês",
            "url": "https://www.todamateria.com.br/falsos-cognatos-no-ingles-false-friends/"
          },
          {
            "label": "Descomplica — Referências e ambiguidades em textos de inglês",
            "url": "https://descomplica.com.br/blog/como-identificar-referencias-e-evitar-ambiguidades-em-textos-2/"
          }
        ]
      }
    ]
  },
  {
    "id": "artes-ef-tic",
    "name": "Artes, Educação Física e Tecnologias da Informação",
    "group": "Linguagens, Códigos e suas Tecnologias",
    "intro": "São temas que aparecem em poucas questões, geralmente pela interpretação de imagens, textos e manifestações culturais. Um estudo leve e contínuo costuma bastar.",
    "orientacoes": [
      "Observe imagens, obras e manifestações culturais brasileiras e pratique descrevê-las e relacioná-las ao contexto.",
      "Treine ler gráficos, tabelas e infográficos, que também aparecem nas outras áreas.",
      "Em Educação Física, foque em saúde, corpo, esporte e cultura corporal como fenômenos sociais."
    ],
    "topics": [
      {
        "id": "enem-art-1",
        "title": "Artes",
        "summary": "Noções de artes visuais, música, dança, teatro e cinema, e expressões culturais e artísticas brasileiras.",
        "links": [
          {
            "label": "Toda Matéria — Tipos de arte",
            "url": "https://www.todamateria.com.br/tipos-de-arte/"
          },
          {
            "label": "Quero Bolsa — O que estudar em Artes para o Enem",
            "url": "https://querobolsa.com.br/revista/o-que-estudar-em-artes-para-o-enem-principais-topicos-e-exemplos-praticos"
          }
        ]
      },
      {
        "id": "enem-art-2",
        "title": "Educação Física",
        "summary": "Práticas corporais, esportes, conceitos de saúde e o corpo como forma de expressão e cultura.",
        "links": [
          {
            "label": "Educa Mais Brasil — Educação Física no Enem",
            "url": "https://www.educamaisbrasil.com.br/enem/educacao-fisica"
          },
          {
            "label": "CNN Brasil — Educação Física no Enem",
            "url": "https://www.cnnbrasil.com.br/educacao/educacao-fisica-no-enem-saiba-como-a-disciplina-e-cobrada-no-exame/"
          }
        ]
      },
      {
        "id": "enem-art-3",
        "title": "Tecnologias da Informação e Comunicação",
        "summary": "Mídias digitais, cultura digital e interpretação de imagens, gráficos, tabelas e infográficos.",
        "links": [
          {
            "label": "Manual do Enem — Cultura digital",
            "url": "https://querobolsa.com.br/enem/sociologia/cultura-digital"
          },
          {
            "label": "Projeto Agatha — Questões Enem de Tecnologia da Informação",
            "url": "https://projetoagathaedu.com.br/questoes-enem/linguagens/tecnologia-da-informacao.php"
          }
        ]
      }
    ]
  },
  {
    "id": "historia",
    "name": "História",
    "group": "Ciências Humanas e suas Tecnologias",
    "intro": "O ENEM prefere perguntar sobre processos e consequências a pedir datas. Saber por que algo aconteceu e como isso se liga ao presente vale mais que decorar sequências.",
    "orientacoes": [
      "Estude por grandes processos e causas, e monte linhas do tempo que liguem Brasil e mundo.",
      "Pratique analisar fontes: quem escreveu, quando, para quem e com qual intenção.",
      "Conecte os fatos históricos com problemas atuais, pois o exame gosta dessa ponte.",
      "Dê atenção especial à República brasileira, ao século XX e à escravidão e suas heranças."
    ],
    "topics": [
      {
        "id": "enem-his-1",
        "title": "História do Brasil",
        "summary": "Períodos colonial, imperial e republicano: economia, sociedade, política e cultura.",
        "links": [
          {
            "label": "Toda Matéria — A História do Brasil",
            "url": "https://www.todamateria.com.br/a-historia-do-brasil/"
          },
          {
            "label": "Descomplica — Resumo de História do Brasil para o Enem",
            "url": "https://descomplica.com.br/blog/resumo-historia-do-brasil-origens-i/"
          }
        ]
      },
      {
        "id": "enem-his-2",
        "title": "História Geral",
        "summary": "Idade Antiga, Média, Moderna e Contemporânea, com seus principais processos.",
        "links": [
          {
            "label": "Toda Matéria — Divisão da História",
            "url": "https://www.todamateria.com.br/divisao-da-historia/"
          },
          {
            "label": "Toda Matéria — Idade Moderna",
            "url": "https://www.todamateria.com.br/idade-moderna/"
          }
        ]
      },
      {
        "id": "enem-his-3",
        "title": "Revoluções, guerras e independências",
        "summary": "Grandes revoluções, as duas guerras mundiais e os processos de independência, com causas e consequências.",
        "links": [
          {
            "label": "História do Mundo — Revolução Francesa",
            "url": "https://www.historiadomundo.com.br/idade-moderna/revolucao-francesa.htm"
          },
          {
            "label": "Toda Matéria — Primeira Guerra Mundial",
            "url": "https://www.todamateria.com.br/primeira-guerra-mundial/"
          }
        ]
      },
      {
        "id": "enem-his-4",
        "title": "Movimentos sociais e culturais",
        "summary": "Lutas por direitos e transformações culturais ao longo do tempo, no Brasil e no mundo.",
        "links": [
          {
            "label": "Toda Matéria — Movimentos sociais",
            "url": "https://www.todamateria.com.br/movimentos-sociais/"
          },
          {
            "label": "Estuda Enem — Movimentos sociais no Brasil",
            "url": "https://estudaenem.blog/2025/09/14/movimentos-sociais-no-brasil-do-seculo-xx-a-atualidade/"
          }
        ]
      }
    ]
  },
  {
    "id": "geografia",
    "name": "Geografia",
    "group": "Ciências Humanas e suas Tecnologias",
    "intro": "A Geografia do ENEM mistura mapas, dados e atualidades. Interpretar o que a questão mostra costuma ser mais importante que memorizar nomes.",
    "orientacoes": [
      "Treine ler mapas, escalas, coordenadas, gráficos e tabelas.",
      "Acompanhe notícias sobre conflitos, economia global, clima e meio ambiente e tente explicá-las com conceitos da matéria.",
      "Relacione natureza e sociedade: como o uso do espaço causa impactos ambientais e como eles afetam as pessoas.",
      "Estude exemplos concretos de cidades, regiões e biomas brasileiros."
    ],
    "topics": [
      {
        "id": "enem-geo-1",
        "title": "Geopolítica, globalização e conflitos",
        "summary": "Relações de poder entre países, blocos econômicos, globalização e conflitos internacionais contemporâneos.",
        "links": [
          {
            "label": "Toda Matéria — Geopolítica",
            "url": "https://www.todamateria.com.br/geografia/geopolitica/"
          },
          {
            "label": "Descomplica — Geopolítica mundial",
            "url": "https://descomplica.com.br/blog/resumo-geopolitica-mundial/"
          }
        ]
      },
      {
        "id": "enem-geo-2",
        "title": "Cartografia",
        "summary": "Leitura de mapas, coordenadas, escalas e projeções.",
        "links": [
          {
            "label": "Aprova Total — Cartografia: resumo completo",
            "url": "https://aprovatotal.com.br/cartografia-resumo-completo/"
          }
        ]
      },
      {
        "id": "enem-geo-3",
        "title": "Urbanização, industrialização e meio ambiente",
        "summary": "Crescimento das cidades, processos industriais, problemas urbanos e impactos ambientais.",
        "links": [
          {
            "label": "Toda Matéria — Industrialização e urbanização",
            "url": "https://www.todamateria.com.br/industrializacao-e-urbanizacao/"
          },
          {
            "label": "Toda Matéria — Problemas ambientais urbanos",
            "url": "https://www.todamateria.com.br/problemas-ambientais-urbanos/"
          }
        ]
      },
      {
        "id": "enem-geo-4",
        "title": "Recursos naturais, clima, vegetação e sustentabilidade",
        "summary": "Clima, biomas, uso de recursos naturais e alternativas sustentáveis.",
        "links": [
          {
            "label": "Toda Matéria — Biomas brasileiros",
            "url": "https://www.todamateria.com.br/biomas-brasileiros/"
          }
        ]
      }
    ]
  },
  {
    "id": "filosofia-sociologia",
    "name": "Filosofia e Sociologia",
    "group": "Ciências Humanas e suas Tecnologias",
    "intro": "As questões trazem trechos de pensadores e situações do cotidiano e pedem que você reconheça conceitos e os aplique. Entender a ideia importa mais que decorar nomes.",
    "orientacoes": [
      "Para cada pensador ou teoria, aprenda a ideia central e saiba explicá-la com exemplo atual.",
      "Leia trechos curtos de textos originais para se acostumar com a linguagem.",
      "Use esses conceitos também como repertório para a redação.",
      "Relacione temas como cidadania, desigualdade e cultura com notícias recentes."
    ],
    "topics": [
      {
        "id": "enem-fs-1",
        "title": "Ética, cidadania e justiça",
        "summary": "Conceitos de ética, direitos e deveres, justiça e participação política.",
        "links": [
          {
            "label": "Toda Matéria — Cidadania",
            "url": "https://www.todamateria.com.br/cidadania/"
          },
          {
            "label": "PrePara Enem — Cidadania",
            "url": "https://www.preparaenem.com/sociologia/cidadania.htm"
          }
        ]
      },
      {
        "id": "enem-fs-2",
        "title": "Cultura, sociedade e identidade",
        "summary": "Como grupos e indivíduos constroem identidade, cultura e formas de convivência.",
        "links": [
          {
            "label": "PrePara Enem — Identidade cultural",
            "url": "https://www.preparaenem.com/sociologia/identidade-cultural.htm"
          },
          {
            "label": "Toda Matéria — Sociologia no Enem: o que estudar",
            "url": "https://www.todamateria.com.br/sociologia-no-enem-o-que-estudar/"
          }
        ]
      },
      {
        "id": "enem-fs-3",
        "title": "Movimentos sociais, direitos humanos e diversidade",
        "summary": "Lutas por direitos, combate a preconceitos e valorização da diversidade.",
        "links": [
          {
            "label": "Manual do Enem — Movimentos sociais",
            "url": "https://querobolsa.com.br/enem/sociologia/movimentos-sociais"
          },
          {
            "label": "Manual do Enem — Movimento negro",
            "url": "https://querobolsa.com.br/enem/sociologia/movimento-negro"
          }
        ]
      },
      {
        "id": "enem-fs-4",
        "title": "Teorias filosóficas e sociológicas",
        "summary": "Principais pensadores e correntes da filosofia e da sociologia e suas ideias centrais.",
        "links": [
          {
            "label": "InfoEscola — Pensadores da sociologia",
            "url": "https://www.infoescola.com/sociologia/pensadores-da-sociologia/"
          },
          {
            "label": "Blog do Enem — Émile Durkheim",
            "url": "https://blogdoenem.com.br/pensadores-sociologia-emile-durkheim/"
          }
        ]
      }
    ]
  },
  {
    "id": "biologia",
    "name": "Biologia",
    "group": "Ciências da Natureza e suas Tecnologias",
    "intro": "A Biologia costuma render bons pontos para quem entende os conceitos e sabe interpretar dados, gráficos e situações reais de saúde e ambiente.",
    "orientacoes": [
      "Priorize Ecologia, Genética, Evolução e Fisiologia humana, que aparecem com frequência.",
      "Use esquemas e desenhos para fixar ciclos, sistemas e cadeias alimentares.",
      "Resolva problemas de genética até ficarem automáticos.",
      "Acompanhe notícias sobre saúde, vacinas, biotecnologia e meio ambiente, que viram contexto de questões."
    ],
    "topics": [
      {
        "id": "enem-bio-1",
        "title": "Genética e biotecnologia",
        "summary": "Hereditariedade, cruzamentos, DNA, transgênicos, clonagem e aplicações da biotecnologia.",
        "links": [
          {
            "label": "Toda Matéria — Leis de Mendel",
            "url": "https://www.todamateria.com.br/leis-de-mendel/"
          },
          {
            "label": "Toda Matéria — Exercícios sobre biotecnologia",
            "url": "https://www.todamateria.com.br/exercicios-sobre-biotecnologia-com-gabarito-explicado/"
          }
        ]
      },
      {
        "id": "enem-bio-2",
        "title": "Evolução, ecologia e ciclos biogeoquímicos",
        "summary": "Seleção natural, relações entre seres vivos, cadeias alimentares, biomas e ciclos da matéria.",
        "links": [
          {
            "label": "Toda Matéria — Seleção natural",
            "url": "https://www.todamateria.com.br/selecao-natural/"
          },
          {
            "label": "Manual do Enem — Ciclos biogeoquímicos",
            "url": "https://querobolsa.com.br/enem/biologia/ciclos-biogeoquimicos"
          }
        ]
      },
      {
        "id": "enem-bio-3",
        "title": "Fisiologia humana e animal",
        "summary": "Funcionamento dos sistemas do corpo e comparações com outros animais.",
        "links": [
          {
            "label": "Toda Matéria — Sistemas do corpo humano",
            "url": "https://www.todamateria.com.br/sistemas-do-corpo-humano/"
          },
          {
            "label": "Toda Matéria — Sistema digestório",
            "url": "https://www.todamateria.com.br/sistema-digestivo-sistema-digestorio/"
          }
        ]
      },
      {
        "id": "enem-bio-4",
        "title": "Microbiologia e saúde",
        "summary": "Vírus, bactérias e outros microrganismos, doenças, prevenção e saúde pública.",
        "links": [
          {
            "label": "Toda Matéria — Doenças causadas por vírus",
            "url": "https://www.todamateria.com.br/doencas-causadas-por-virus/"
          },
          {
            "label": "PrePara Enem — Microbiologia",
            "url": "https://www.preparaenem.com/biologia/microbiologia.htm"
          }
        ]
      }
    ]
  },
  {
    "id": "quimica",
    "name": "Química",
    "group": "Ciências da Natureza e suas Tecnologias",
    "intro": "O ENEM cobra conceitos e aplicação em contextos como meio ambiente, alimentos e energia. Decorar fórmulas ajuda pouco sem entender o que acontece.",
    "orientacoes": [
      "Domine primeiro mol, estequiometria e tabela periódica, que sustentam os outros temas.",
      "Treine cálculos de concentração, pH e energia com exercícios progressivos.",
      "Em orgânica, aprenda funções e nomenclatura com moléculas reais do dia a dia.",
      "Leia sobre poluição, combustíveis e reciclagem, que aparecem com frequência."
    ],
    "topics": [
      {
        "id": "enem-qui-1",
        "title": "Estrutura atômica e tabela periódica",
        "summary": "Modelos atômicos, partículas, distribuição eletrônica e propriedades periódicas.",
        "links": [
          {
            "label": "Professor Ferretto — Tabela periódica",
            "url": "https://blog.professorferretto.com.br/quimica/tabela-periodica/"
          },
          {
            "label": "Manual do Enem — Tabela periódica",
            "url": "https://querobolsa.com.br/enem/quimica/tabela-periodica"
          }
        ]
      },
      {
        "id": "enem-qui-2",
        "title": "Ligações, reações e estequiometria",
        "summary": "Tipos de ligação, reações químicas, balanceamento e cálculos com quantidades de substância.",
        "links": [
          {
            "label": "Toda Matéria — Exercícios de ligações químicas",
            "url": "https://www.todamateria.com.br/exercicios-de-ligacoes-quimicas/"
          },
          {
            "label": "Toda Matéria — Estequiometria",
            "url": "https://www.todamateria.com.br/estequiometria/"
          }
        ]
      },
      {
        "id": "enem-qui-3",
        "title": "Química orgânica",
        "summary": "Hidrocarbonetos, funções orgânicas e suas principais reações.",
        "links": [
          {
            "label": "Toda Matéria — Funções orgânicas",
            "url": "https://www.todamateria.com.br/funcoes-organicas/"
          },
          {
            "label": "Toda Matéria — Hidrocarbonetos",
            "url": "https://www.todamateria.com.br/hidrocarbonetos/"
          }
        ]
      },
      {
        "id": "enem-qui-4",
        "title": "Físico-química",
        "summary": "Soluções, calor, energia e propriedades da matéria.",
        "links": [
          {
            "label": "Professor Ferretto — Concentração de soluções",
            "url": "https://blog.professorferretto.com.br/quimica/concentracao-de-solucoes-tipos-formulas-e-calculos-para-o-enem/"
          },
          {
            "label": "Manual da Química — Soluções",
            "url": "https://www.manualdaquimica.com/fisico-quimica/solucoes.htm"
          }
        ]
      },
      {
        "id": "enem-qui-5",
        "title": "Impactos ambientais e sustentabilidade",
        "summary": "Poluição, resíduos, combustíveis e alternativas sustentáveis do ponto de vista químico.",
        "links": [
          {
            "label": "Toda Matéria — Chuva ácida",
            "url": "https://www.todamateria.com.br/chuva-acida/"
          },
          {
            "label": "PrePara Enem — Poluição e chuva ácida",
            "url": "https://www.preparaenem.com/quimica/poluicao-e-chuva-acida.htm"
          }
        ]
      }
    ]
  },
  {
    "id": "fisica",
    "name": "Física",
    "group": "Ciências da Natureza e suas Tecnologias",
    "intro": "Aprender os conceitos fundamentais vale mais que decorar fórmulas. O ENEM costuma apresentar situações reais e pedir raciocínio.",
    "orientacoes": [
      "Descreva o fenômeno com palavras e faça um desenho antes de aplicar qualquer fórmula.",
      "Preste atenção às unidades e faça as conversões antes das contas.",
      "Revise proporção, funções e vetores, que sustentam a Física.",
      "Interprete gráficos como se fossem textos."
    ],
    "topics": [
      {
        "id": "enem-fis-1",
        "title": "Mecânica",
        "summary": "Movimento, força e leis de Newton.",
        "links": [
          {
            "label": "PrePara Enem — 1ª lei de Newton no Enem",
            "url": "https://www.preparaenem.com/enem/primeira-lei-de-newton-no-enem.htm"
          },
          {
            "label": "Blog do Enem — Leis de Newton",
            "url": "https://blogdoenem.com.br/leis-de-newton-simulado-enem/"
          }
        ]
      },
      {
        "id": "enem-fis-2",
        "title": "Termologia",
        "summary": "Calor, temperatura e calorimetria.",
        "links": [
          {
            "label": "Toda Matéria — Calorimetria",
            "url": "https://www.todamateria.com.br/calorimetria/"
          },
          {
            "label": "Toda Matéria — Termologia",
            "url": "https://www.todamateria.com.br/fisica/termologia/"
          }
        ]
      },
      {
        "id": "enem-fis-3",
        "title": "Eletricidade e magnetismo",
        "summary": "Circuitos, corrente elétrica e campo magnético.",
        "links": [
          {
            "label": "Toda Matéria — Eletrodinâmica",
            "url": "https://www.todamateria.com.br/eletrodinamica/"
          },
          {
            "label": "Toda Matéria — Leis de Ohm",
            "url": "https://www.todamateria.com.br/leis-de-ohm/"
          }
        ]
      },
      {
        "id": "enem-fis-4",
        "title": "Ondas, ótica e acústica",
        "summary": "Comportamento de ondas, luz, lentes, espelhos e som.",
        "links": [
          {
            "label": "Toda Matéria — Ondas e óptica",
            "url": "https://www.todamateria.com.br/fisica/ondulatoria/"
          },
          {
            "label": "PrePara Enem — Acústica",
            "url": "https://www.preparaenem.com/fisica/acustica.htm"
          }
        ]
      },
      {
        "id": "enem-fis-5",
        "title": "Energia, trabalho e potência",
        "summary": "Transformações e conservação de energia, trabalho de uma força e potência.",
        "links": [
          {
            "label": "Toda Matéria — Potência mecânica e rendimento",
            "url": "https://www.todamateria.com.br/potencia-mecanica-e-rendimento/"
          },
          {
            "label": "Toda Matéria — Fórmulas de potência",
            "url": "https://www.todamateria.com.br/formulas-de-potencia/"
          }
        ]
      }
    ]
  },
  {
    "id": "matematica",
    "name": "Matemática",
    "group": "Matemática e suas Tecnologias",
    "intro": "São 45 questões, e a área costuma ter a menor média entre os candidatos, então vale um reforço extra. O foco é aplicar conceitos a problemas do dia a dia.",
    "orientacoes": [
      "Resolva muitas questões: Matemática se aprende praticando.",
      "Garanta a base: frações, porcentagem, regra de três e proporção aparecem em todo lugar.",
      "Leia o enunciado com calma e identifique o que foi dado e o que foi pedido.",
      "Treine gráficos e tabelas, que aparecem em Estatística e em outras matérias.",
      "Comece pelas questões mais fáceis na prova e deixe as demoradas para depois."
    ],
    "topics": [
      {
        "id": "enem-mat-1",
        "title": "Equações e inequações",
        "summary": "Equações e inequações do 1º e do 2º grau e sua aplicação em problemas.",
        "links": [
          {
            "label": "Toda Matéria — Equação do 2º grau",
            "url": "https://www.todamateria.com.br/equacao-do-segundo-grau/"
          },
          {
            "label": "Toda Matéria — Inequação do 1º e 2º graus",
            "url": "https://www.todamateria.com.br/inequacao/"
          }
        ]
      },
      {
        "id": "enem-mat-2",
        "title": "Funções e progressões",
        "summary": "Funções linear, quadrática, exponencial e logarítmica, e progressões aritméticas e geométricas.",
        "links": [
          {
            "label": "Toda Matéria — Função exponencial",
            "url": "https://www.todamateria.com.br/funcao-exponencial/"
          },
          {
            "label": "Toda Matéria — Função logarítmica",
            "url": "https://www.todamateria.com.br/funcao-logaritmica/"
          }
        ]
      },
      {
        "id": "enem-mat-3",
        "title": "Geometria",
        "summary": "Geometria plana e espacial: triângulos, quadriláteros, círculo, prismas, cilindros, cones e esferas, com perímetro, área e volume.",
        "links": [
          {
            "label": "Toda Matéria — Áreas de figuras planas",
            "url": "https://www.todamateria.com.br/areas-de-figuras-planas/"
          },
          {
            "label": "Toda Matéria — Geometria espacial",
            "url": "https://www.todamateria.com.br/geometria-espacial/"
          }
        ]
      },
      {
        "id": "enem-mat-4",
        "title": "Estatística",
        "summary": "Leitura de gráficos e tabelas, média, mediana, moda e desvio padrão.",
        "links": [
          {
            "label": "Toda Matéria — Estatística",
            "url": "https://www.todamateria.com.br/matematica/estatistica/"
          },
          {
            "label": "Toda Matéria — Variância e desvio padrão",
            "url": "https://www.todamateria.com.br/variancia-e-desvio-padrao/"
          }
        ]
      },
      {
        "id": "enem-mat-5",
        "title": "Probabilidade",
        "summary": "Probabilidade simples e composta, em situações do cotidiano.",
        "links": [
          {
            "label": "Toda Matéria — Probabilidade",
            "url": "https://www.todamateria.com.br/probabilidade/"
          },
          {
            "label": "Manual do Enem — Probabilidade",
            "url": "https://querobolsa.com.br/enem/matematica/probabilidade"
          }
        ]
      },
      {
        "id": "enem-mat-6",
        "title": "Matemática financeira",
        "summary": "Juros simples e compostos, descontos, investimentos e parcelas.",
        "links": [
          {
            "label": "Toda Matéria — Juros simples e compostos",
            "url": "https://www.todamateria.com.br/juros-simples-e-compostos/"
          },
          {
            "label": "Toda Matéria — Matemática financeira",
            "url": "https://www.todamateria.com.br/matematica/matematica-financeira/"
          }
        ]
      },
      {
        "id": "enem-mat-7",
        "title": "Raciocínio lógico e problemas contextualizados",
        "summary": "Regra de três, proporção, porcentagem e interpretação de dados para tomar decisões.",
        "links": [
          {
            "label": "Toda Matéria — Regra de três simples e composta",
            "url": "https://www.todamateria.com.br/regra-de-tres-simples-e-composta/"
          },
          {
            "label": "Toda Matéria — Razão e proporção",
            "url": "https://www.todamateria.com.br/razao-e-proporcao/"
          }
        ]
      }
    ]
  },
  {
    "id": "redacao",
    "name": "Redação",
    "group": "Redação",
    "intro": "A redação vale até 1000 pontos e depende muito de treino. Um texto claro, bem organizado e com proposta de intervenção completa já garante boa nota.",
    "orientacoes": [
      "Escreva pelo menos um texto por semana e peça correção, de um professor ou da plataforma.",
      "Monte um repertório de referências (dados, fatos históricos, conceitos de Filosofia e Sociologia) que possa servir a vários temas.",
      "Planeje antes de escrever: tese, dois argumentos e proposta de intervenção.",
      "Treine a proposta completa, com agente, ação, meio, finalidade e detalhamento.",
      "Reserve tempo para revisar ortografia, pontuação e concordância."
    ],
    "topics": [
      {
        "id": "enem-red-1",
        "title": "Estrutura dissertativo-argumentativa",
        "summary": "Introdução com tese, desenvolvimento com argumentos e conclusão com proposta de intervenção.",
        "links": [
          {
            "label": "Português.com.br — Redação do Enem: estrutura e critérios",
            "url": "https://www.portugues.com.br/redacao/redacao-enem.html"
          }
        ]
      },
      {
        "id": "enem-red-2",
        "title": "Argumentação e repertório",
        "summary": "Como escolher e desenvolver argumentos claros e coerentes, com repertório sociocultural pertinente.",
        "links": [
          {
            "label": "Curso Anglo — Repertório sociocultural: como usar",
            "url": "https://cursoanglo.com.br/conteudos/repertorio-sociocultural-redacao-enem-como-usar/"
          },
          {
            "label": "Quero Bolsa — Como criar repertório para a redação",
            "url": "https://querobolsa.com.br/revista/como-criar-repertorio-para-redacao-do-enem"
          }
        ]
      },
      {
        "id": "enem-red-3",
        "title": "Proposta de intervenção",
        "summary": "Solução para o problema com agente, ação, meio, finalidade e detalhamento, respeitando os direitos humanos.",
        "links": [
          {
            "label": "Toda Matéria — Proposta de intervenção na redação do Enem",
            "url": "https://www.todamateria.com.br/proposta-de-intervencao-na-redacao-do-enem-o-que-e-e-como-fazer/"
          }
        ]
      },
      {
        "id": "enem-red-4",
        "title": "Norma culta e coesão",
        "summary": "Domínio da língua escrita padrão e uso de conectivos e retomadas para ligar as ideias.",
        "links": [
          {
            "label": "PrePara Enem — Competência 4 da redação",
            "url": "https://www.preparaenem.com/enem/competencia-4-da-redacao-do-enem.htm"
          },
          {
            "label": "Manual do Enem — Conectivos para desenvolvimento",
            "url": "https://querobolsa.com.br/enem/portugues/conectivos-para-desenvolvimento"
          }
        ]
      },
      {
        "id": "enem-red-5",
        "title": "Temas e atualidades",
        "summary": "Assuntos sociais, culturais, políticos e ambientais que costumam aparecer e como se atualizar sobre eles.",
        "links": [
          {
            "label": "CNN Brasil — Temas da redação do Enem dos últimos 20 anos",
            "url": "https://www.cnnbrasil.com.br/educacao/redacao-do-enem-veja-todos-os-temas-dos-ultimos-20-anos/"
          },
          {
            "label": "Estratégia — Temas de redação do Enem",
            "url": "https://vestibulares.estrategia.com/portal/materias/redacao/temas-de-redacao-do-enem-nos-ultimos-anos/"
          }
        ]
      }
    ]
  }
]
