// Guia de estudos da UFSC baseado no Programa das Disciplinas do Vestibular
// Unificado UFSC/IFC 2027 (COPERVE). Textos reescritos; links de estudo
// externos verificados na geração.

import type { StudySubject } from './studyGuideTypes'

export const UFSC_PROGRAM_PDF =
  'https://coperve.paginas.ufsc.br/files/2026/08/Programa-Vestibular-Unificado-2027.pdf'

export const UFSC_STUDY_GUIDE: StudySubject[] = [
  {
    "id": "portugues",
    "name": "Língua Portuguesa e Literatura Brasileira",
    "group": "Linguagens",
    "intro": "A prova cobra leitura, interpretação e análise de como a língua funciona em textos reais. Decorar nomenclatura gramatical isolada rende pouco; entender o efeito de cada recurso no texto rende muito.",
    "orientacoes": [
      "Leia textos de gêneros variados toda semana (reportagem, artigo de opinião, conto, crônica, charge, poema) e, para cada um, anote a ideia central, o ponto de vista do autor e o que fica só sugerido.",
      "Treine separar fato de opinião e identificar quem está falando em cada trecho, pois a prova explora as diferentes \"vozes\" de um texto.",
      "Em gramática, estude sempre a partir de frases e textos: pergunte-se por que o autor escolheu aquela palavra, aquele tempo verbal ou aquela pontuação.",
      "Em literatura, priorize a leitura das obras indicadas e a relação de cada uma com seu contexto histórico e com o movimento literário; datas e nomes soltos pesam pouco.",
      "Resolva provas anteriores da UFSC/COPERVE e corrija errando de propósito: para cada alternativa errada, escreva por que ela está errada."
    ],
    "topics": [
      {
        "id": "por-1",
        "title": "Compreensão e interpretação de textos",
        "summary": "Sentido global, ideias principais e secundárias, informações implícitas, linha argumentativa, fato x opinião, vozes do texto, figuras de linguagem, gênero e tipo textual, registro, variedades e modalidades da língua.",
        "links": [
          {
            "label": "Curso Anglo — Como dominar interpretação de textos no vestibular",
            "url": "https://cursoanglo.com.br/conteudos/interpretacao-de-textos/"
          },
          {
            "label": "Blog Mackenzie — Dicas para treinar interpretação de texto",
            "url": "https://blog.mackenzie.br/vestibular/materias-vestibular/dicas-interpretacao-de-texto-para-o-vestibular/"
          }
        ]
      },
      {
        "id": "por-2",
        "title": "Análise de recursos linguísticos",
        "summary": "Funções de recursos gramaticais e lexicais no texto (fonético, morfológico, sintático, semântico, pragmático e discursivo), adequação ao contexto de uso e domínio da norma padrão escrita, com reflexão sobre as demais variedades.",
        "links": [
          {
            "label": "Brasil Escola — Variações linguísticas",
            "url": "https://brasilescola.uol.com.br/gramatica/variacoes-linguisticas.htm"
          },
          {
            "label": "Toda Matéria — Coesão textual",
            "url": "https://www.todamateria.com.br/coesao-textual/"
          }
        ]
      },
      {
        "id": "por-3",
        "title": "Literatura Brasileira",
        "summary": "Leitura do texto literário como criação estética, relação com o contexto sociocultural e com o movimento a que pertence, organização e estrutura das obras e singularidades da linguagem literária.",
        "links": [
          {
            "label": "Toda Matéria — Movimentos literários",
            "url": "https://www.todamateria.com.br/movimentos-literarios/"
          },
          {
            "label": "Toda Matéria — Literatura brasileira",
            "url": "https://www.todamateria.com.br/literatura-brasileira/"
          }
        ]
      }
    ],
    "extra": {
      "title": "Obras indicadas para 2027",
      "intro": "A COPERVE pede leitura integral das obras abaixo, com atenção ao contexto histórico, social, cultural e estético de cada uma.",
      "items": [
        {
          "id": "por-ob-1",
          "title": "Primeiro de abril: narrativas da cadeia — Salim Miguel",
          "summary": "Memória autobiográfica (1994) sobre a prisão do autor após o golpe de 1964; disponível pela Editora UFSC.",
          "links": [
            {
              "label": "Wikipédia — Salim Miguel",
              "url": "https://pt.wikipedia.org/wiki/Salim_Miguel"
            },
            {
              "label": "Editora UFSC — Estante aberta",
              "url": "https://editora.ufsc.br/estante-aberta/"
            }
          ]
        },
        {
          "id": "por-ob-2",
          "title": "Vésperas — Adriana Lunardi",
          "summary": "Livro de contos (2002) da autora catarinense.",
          "links": [
            {
              "label": "Wikipédia — Adriana Lunardi",
              "url": "https://pt.wikipedia.org/wiki/Adriana_Lunardi"
            }
          ]
        },
        {
          "id": "por-ob-3",
          "title": "O irmão alemão — Chico Buarque",
          "summary": "Romance (2014) que mistura memória familiar, ditadura e a busca por um irmão na Alemanha.",
          "links": [
            {
              "label": "Wikipédia — O irmão alemão",
              "url": "https://pt.wikipedia.org/wiki/O_Irm%C3%A3o_Alem%C3%A3o"
            }
          ]
        },
        {
          "id": "por-ob-4",
          "title": "Eu sou Macuxi e outras histórias — Julie Dorrico",
          "summary": "Ficção literária (2019) de autoria indígena, ligada à cultura e à resistência do povo Macuxi.",
          "links": [
            {
              "label": "Wikipédia — Julie Dorrico",
              "url": "https://pt.wikipedia.org/wiki/Julie_Dorrico"
            }
          ]
        },
        {
          "id": "por-ob-5",
          "title": "Clara dos Anjos — Lima Barreto",
          "summary": "Romance (publicado em 1948) sobre racismo e desigualdade social no subúrbio carioca; obra em domínio público.",
          "links": [
            {
              "label": "Domínio Público — Clara dos Anjos",
              "url": "https://www.dominiopublico.gov.br/pesquisa/DetalheObraForm.do?select_action=&co_obra=2060"
            },
            {
              "label": "Wikipédia — Clara dos Anjos",
              "url": "https://pt.wikipedia.org/wiki/Clara_dos_Anjos"
            }
          ]
        },
        {
          "id": "por-ob-6",
          "title": "A paixão segundo G. H. — Clarice Lispector",
          "summary": "Romance (1964) centrado em uma experiência interior e existencial de forte linguagem simbólica.",
          "links": [
            {
              "label": "Wikipédia — A paixão segundo G.H.",
              "url": "https://pt.wikipedia.org/wiki/A_Paix%C3%A3o_Segundo_G.H."
            },
            {
              "label": "Canal do Ensino — Resumo de A Paixão Segundo G.H.",
              "url": "https://canaldoensino.com.br/blog/a-paixao-segundo-g-h-de-clarice-lispector"
            }
          ]
        },
        {
          "id": "por-ob-7",
          "title": "Secos e Molhados — álbum de 1973",
          "summary": "Álbum musical a ser analisado como texto poético e sonoro, em seu contexto histórico e cultural.",
          "links": [
            {
              "label": "Wikipédia — Secos & Molhados",
              "url": "https://pt.wikipedia.org/wiki/Secos_%26_Molhados"
            }
          ]
        }
      ]
    }
  },
  {
    "id": "redacao",
    "name": "Redação (Produção Textual)",
    "group": "Linguagens",
    "intro": "A redação parte de um tema apresentado com textos motivadores e pede um gênero específico, que pode ser dissertação, artigo de opinião, carta, crônica ou conto. Fugir totalmente do tema zera a nota.",
    "orientacoes": [
      "Leia a proposta duas vezes e marque o gênero pedido e o recorte do tema antes de escrever qualquer linha.",
      "Monte um esquema rápido (tese, dois ou três argumentos, fechamento) e só depois redija; texto sem plano tende a circular nas mesmas ideias.",
      "Use dados, exemplos e referências concretas em vez de afirmações vagas como \"desde o início dos tempos\".",
      "Treine o gênero, não só a dissertação: escreva também cartas e crônicas e compare o tom de cada um.",
      "Reserve os últimos minutos para revisar ortografia, acentuação, crase, concordância e pontuação.",
      "Peça a alguém, ou use a plataforma, para corrigir seus textos e acompanhe quais erros se repetem."
    ],
    "topics": [
      {
        "id": "red-1",
        "title": "Adequação à proposta: tema e gênero",
        "summary": "Interpretar a proposta, desenvolver o tema no gênero solicitado e usar recursos linguísticos adequados à situação de produção.",
        "links": [
          {
            "label": "Brasil Escola — Gêneros textuais",
            "url": "https://brasilescola.uol.com.br/redacao/generos-textuais.htm"
          },
          {
            "label": "Toda Matéria — Gêneros textuais",
            "url": "https://www.todamateria.com.br/generos-textuais/"
          }
        ]
      },
      {
        "id": "red-2",
        "title": "Modalidade escrita na variedade padrão",
        "summary": "Ortografia, acentuação, pontuação, regência, concordância, crase e uso de pronomes; outras variedades só como recurso estilístico em falas de personagens.",
        "links": [
          {
            "label": "Brasil Escola — Crase",
            "url": "https://brasilescola.uol.com.br/gramatica/crase.htm"
          },
          {
            "label": "Toda Matéria — Concordância verbal",
            "url": "https://www.todamateria.com.br/concordancia-verbal/"
          }
        ]
      },
      {
        "id": "red-3",
        "title": "Coerência e coesão",
        "summary": "Organização em parágrafos, relações de sentido sem contradição, progressão das ideias sem repetição vazia, uso de conectivos e retomadas claras e tempos verbais compatíveis.",
        "links": [
          {
            "label": "Toda Matéria — Coesão textual",
            "url": "https://www.todamateria.com.br/coesao-textual/"
          },
          {
            "label": "Wikipédia — Coesão textual",
            "url": "https://pt.wikipedia.org/wiki/Coes%C3%A3o_textual"
          }
        ]
      },
      {
        "id": "red-4",
        "title": "Informatividade e argumentação ou narratividade",
        "summary": "Quantidade e qualidade das informações do Ensino Médio, argumentos organizados e convergentes, posicionamento de autoria e referências concretas.",
        "links": [
          {
            "label": "Toda Matéria — Texto dissertativo-argumentativo",
            "url": "https://www.todamateria.com.br/texto-dissertativo-argumentativo/"
          },
          {
            "label": "Toda Matéria — Texto narrativo",
            "url": "https://www.todamateria.com.br/texto-narrativo/"
          }
        ]
      }
    ]
  },
  {
    "id": "segunda-lingua",
    "name": "Segunda Língua e Libras",
    "group": "Linguagens",
    "intro": "O candidato escolhe a segunda língua (Inglês, Espanhol, Italiano, Francês, Alemão, Libras ou Língua Portuguesa). A prova é essencialmente de leitura de textos autênticos, e a gramática aparece a serviço da compreensão.",
    "orientacoes": [
      "Leia diariamente textos curtos na língua escolhida (notícias, textos científicos, propagandas) e treine primeiro a ideia geral, depois os detalhes.",
      "Monte um caderno de vocabulário por temas e priorize palavras que aparecem em reportagens e textos científicos.",
      "Use cognatos, palavras-chave e imagens para inferir sentido antes de recorrer ao dicionário.",
      "Estude estruturas gramaticais observando o que mudam no sentido do texto, não como lista de regras.",
      "Quem escolher Libras deve praticar assistindo a vídeos em Libras e analisando mensagem, recursos visuais e variedades da língua."
    ],
    "topics": [
      {
        "id": "seg-1",
        "title": "Leitura e vocabulário em Inglês",
        "summary": "Identificar tipo de texto, tema central e secundário, palavras-chave, referências internas, registros de uso e noções básicas de morfossintaxe e vocabulário.",
        "links": [
          {
            "label": "Toda Matéria — Estratégias de leitura",
            "url": "https://www.todamateria.com.br/estrategias-de-leitura/"
          },
          {
            "label": "Toda Matéria — Skimming e scanning",
            "url": "https://www.todamateria.com.br/skimming-e-scanning/"
          }
        ]
      },
      {
        "id": "seg-2",
        "title": "Leitura e vocabulário em Espanhol",
        "summary": "Mesmas habilidades de leitura, com atenção aos falsos cognatos entre espanhol e português e às equivalências de expressões.",
        "links": [
          {
            "label": "Toda Matéria — Falsos cognatos em espanhol",
            "url": "https://www.todamateria.com.br/falsos-cognatos-no-espanhol-falsos-amigos/"
          }
        ]
      },
      {
        "id": "lib-1",
        "title": "Libras: compreensão de vídeos e recursos linguísticos",
        "summary": "Interpretação de textos em vídeo, análise de recursos gramaticais e lexicais da Libras, aspectos multimodais e variedades linguísticas.",
        "links": [
          {
            "label": "Libras.com.br — Os 5 parâmetros da Libras",
            "url": "https://www.libras.com.br/os-cinco-parametros-da-libras"
          },
          {
            "label": "Wikipédia — Língua brasileira de sinais",
            "url": "https://pt.wikipedia.org/wiki/L%C3%ADngua_brasileira_de_sinais"
          }
        ]
      }
    ]
  },
  {
    "id": "matematica",
    "name": "Matemática",
    "group": "Matemática",
    "intro": "A prova mede domínio da linguagem matemática e capacidade de aplicar conceitos em situações-problema, inclusive conectando temas diferentes. O programa é extenso, então organização do estudo é decisiva.",
    "orientacoes": [
      "Estude por tema e resolva muitas questões logo após a teoria; em Matemática, entender sem praticar não basta.",
      "Comece por Conjuntos Numéricos, Funções e Geometria Plana, que sustentam quase todo o resto do programa.",
      "Treine passar do texto para a linguagem simbólica e o contrário, pois a prova pede leitura de enunciados e interpretação de gráficos.",
      "Mantenha um caderno de erros com a causa de cada um (conta, interpretação, fórmula esquecida) e refaça as questões após alguns dias.",
      "Nos temas de contagem e probabilidade, monte sempre o raciocínio antes de aplicar fórmula.",
      "Faça provas anteriores da UFSC cronometradas para calibrar ritmo."
    ],
    "topics": [
      {
        "id": "mat-1",
        "title": "Conjuntos numéricos",
        "summary": "Divisibilidade, MMC, MDC e fatoração; frações, decimais e notação científica; razão, proporção, regra de três, porcentagem e juros; números reais, valor absoluto, desigualdades e intervalos; números complexos em todas as formas.",
        "links": [
          {
            "label": "Toda Matéria — Conjuntos numéricos",
            "url": "https://www.todamateria.com.br/conjuntos-numericos/"
          },
          {
            "label": "Toda Matéria — Regra de três simples e composta",
            "url": "https://www.todamateria.com.br/regra-de-tres-simples-e-composta/"
          }
        ]
      },
      {
        "id": "mat-2",
        "title": "Funções",
        "summary": "Domínio, imagem, gráficos, paridade, crescimento, composição e inversa; função afim, quadrática, racional, modular, exponencial e logarítmica, com equações e inequações.",
        "links": [
          {
            "label": "Toda Matéria — Função: tipos e gráficos",
            "url": "https://www.todamateria.com.br/funcao/"
          },
          {
            "label": "Toda Matéria — Função afim",
            "url": "https://www.todamateria.com.br/funcao-afim/"
          }
        ]
      },
      {
        "id": "mat-3",
        "title": "Sequências e progressões",
        "summary": "Sequências pelo termo geral e por recorrência, progressões aritméticas e geométricas com termo geral, interpolação e soma.",
        "links": [
          {
            "label": "Toda Matéria — PA e PG",
            "url": "https://www.todamateria.com.br/pa-e-pg/"
          },
          {
            "label": "InfoEscola — Progressão aritmética",
            "url": "https://www.infoescola.com/matematica/progressao-aritmetica/"
          }
        ]
      },
      {
        "id": "mat-4",
        "title": "Análise combinatória, probabilidade e estatística",
        "summary": "Princípios de contagem, arranjos, combinações e permutações, binômio de Newton, probabilidade condicional e eventos independentes, medidas de tendência central e de dispersão.",
        "links": [
          {
            "label": "Toda Matéria — Análise combinatória",
            "url": "https://www.todamateria.com.br/analise-combinatoria/"
          },
          {
            "label": "Toda Matéria — Binômio de Newton",
            "url": "https://www.todamateria.com.br/binomio-de-newton/"
          }
        ]
      },
      {
        "id": "mat-5",
        "title": "Matrizes, determinantes e sistemas lineares",
        "summary": "Tipos e operações com matrizes, cálculo e propriedades de determinantes, resolução, discussão e aplicação de sistemas lineares.",
        "links": [
          {
            "label": "Toda Matéria — Matrizes e determinantes",
            "url": "https://www.todamateria.com.br/matrizes-e-determinantes/"
          },
          {
            "label": "Toda Matéria — Sistemas lineares",
            "url": "https://www.todamateria.com.br/sistemas-lineares/"
          }
        ]
      },
      {
        "id": "mat-6",
        "title": "Trigonometria",
        "summary": "Arcos e ângulos, razões no triângulo retângulo, leis dos senos e dos cossenos, funções trigonométricas e seus gráficos, identidades, fórmulas de adição e equações trigonométricas.",
        "links": [
          {
            "label": "Toda Matéria — Funções trigonométricas",
            "url": "https://www.todamateria.com.br/funcoes-trigonometricas/"
          },
          {
            "label": "InfoEscola — Lei dos senos e dos cossenos",
            "url": "https://www.infoescola.com/trigonometria/lei-dos-senos-e-dos-cossenos/"
          }
        ]
      },
      {
        "id": "mat-7",
        "title": "Polinômios e equações algébricas",
        "summary": "Grau, valor numérico, operações e fatoração de polinômios, raízes e multiplicidade, relações entre coeficientes e raízes.",
        "links": [
          {
            "label": "InfoEscola — Relações de Girard",
            "url": "https://www.infoescola.com/matematica/relacoes-de-girard/"
          },
          {
            "label": "Toda Matéria — Exercícios sobre função polinomial",
            "url": "https://www.todamateria.com.br/exercicios-sobre-funcao-polinomial-questoes-com-gabarito/"
          }
        ]
      },
      {
        "id": "mat-8",
        "title": "Geometria plana",
        "summary": "Ângulos, polígonos, circunferência, paralelas e Teorema de Tales, triângulos (congruência, semelhança e relações métricas), quadriláteros, inscrição e circunscrição, perímetros e áreas.",
        "links": [
          {
            "label": "InfoEscola — Geometria plana",
            "url": "https://www.infoescola.com/geometria-plana/"
          },
          {
            "label": "Toda Matéria — Áreas de figuras planas",
            "url": "https://www.todamateria.com.br/areas-de-figuras-planas/"
          }
        ]
      },
      {
        "id": "mat-9",
        "title": "Geometria espacial",
        "summary": "Poliedros e poliedros regulares, prismas, pirâmides, cilindros, cones, troncos e esfera com áreas e volumes, inscrição e circunscrição de sólidos.",
        "links": [
          {
            "label": "Toda Matéria — Geometria espacial",
            "url": "https://www.todamateria.com.br/geometria-espacial/"
          },
          {
            "label": "InfoEscola — Geometria espacial",
            "url": "https://www.infoescola.com/geometria-espacial/"
          }
        ]
      },
      {
        "id": "mat-10",
        "title": "Geometria analítica",
        "summary": "Ponto e reta no plano cartesiano, distâncias, alinhamento, posições relativas, circunferência e cônicas (parábola, elipse e hipérbole).",
        "links": [
          {
            "label": "Toda Matéria — Geometria analítica",
            "url": "https://www.todamateria.com.br/geometria-analitica-resumo/"
          },
          {
            "label": "Toda Matéria — Cônicas",
            "url": "https://www.todamateria.com.br/conicas/"
          }
        ]
      }
    ]
  },
  {
    "id": "biologia",
    "name": "Biologia",
    "group": "Ciências da Natureza",
    "intro": "A prova pede reconhecimento de estruturas e funções, interpretação de gráficos e dados e aplicação dos conceitos a questões de saúde, sociedade e ambiente.",
    "orientacoes": [
      "Dê peso maior a Biologia Celular e Molecular, Genética, Ecologia, Evolução e Fisiologia humana, que ocupam boa parte do programa.",
      "Em Genética, resolva muitos problemas de cruzamento e de probabilidade; a teoria só fixa com prática.",
      "Use esquemas e desenhos (ciclo celular, cadeias alimentares, sistemas do corpo) em vez de só ler o texto.",
      "Treine interpretação de gráficos e tabelas, que aparecem com frequência em Ecologia e Genética.",
      "Relacione os temas com notícias atuais, como biotecnologia, vacinas e impactos ambientais, porque a prova cobra aplicação."
    ],
    "topics": [
      {
        "id": "bio-1",
        "title": "A investigação nas ciências biológicas",
        "summary": "Método científico, teoria, hipótese e lei, origem da Biologia, conceito de vida e implicações sociais.",
        "links": [
          {
            "label": "Toda Matéria — Método científico",
            "url": "https://www.todamateria.com.br/metodo-cientifico/"
          },
          {
            "label": "InfoEscola — Princípios, modelos, leis, teorias e hipóteses",
            "url": "https://www.infoescola.com/ciencias/principios-modelos-leis-e-teorias/"
          }
        ]
      },
      {
        "id": "bio-2",
        "title": "Biologia celular e molecular",
        "summary": "Compostos orgânicos e inorgânicos, métodos de estudo, membranas e organelas, ciclo celular, respiração, fermentação, fotossíntese, DNA, transcrição e tradução.",
        "links": [
          {
            "label": "Toda Matéria — Organelas citoplasmáticas",
            "url": "https://www.todamateria.com.br/organelas-celulares/"
          },
          {
            "label": "Toda Matéria — Ciclo celular e suas fases",
            "url": "https://www.todamateria.com.br/ciclo-celular/"
          }
        ]
      },
      {
        "id": "bio-3",
        "title": "Histologia",
        "summary": "Tecidos animais e vegetais, suas características e funções.",
        "links": [
          {
            "label": "Toda Matéria — Histologia animal",
            "url": "https://www.todamateria.com.br/histologia-animal/"
          },
          {
            "label": "Toda Matéria — Histologia vegetal",
            "url": "https://www.todamateria.com.br/histologia-vegetal/"
          }
        ]
      },
      {
        "id": "bio-4",
        "title": "Reprodução e desenvolvimento dos seres vivos",
        "summary": "Aspectos gerais da reprodução e formação de tecidos e órgãos.",
        "links": [
          {
            "label": "Toda Matéria — Desenvolvimento embrionário humano",
            "url": "https://www.todamateria.com.br/desenvolvimento-embrionario-humano/"
          },
          {
            "label": "Toda Matéria — Folhetos embrionários",
            "url": "https://www.todamateria.com.br/folhetos-embrionarios/"
          }
        ]
      },
      {
        "id": "bio-5",
        "title": "Os seres vivos",
        "summary": "Vírus, monera, protistas, fungos, plantas e animais: classificação, morfologia, fisiologia e relações ambientais.",
        "links": [
          {
            "label": "Toda Matéria — Classificação dos seres vivos em 5 reinos",
            "url": "https://www.todamateria.com.br/reinos-dos-seres-vivos/"
          },
          {
            "label": "Toda Matéria — Vírus",
            "url": "https://www.todamateria.com.br/virus/"
          }
        ]
      },
      {
        "id": "bio-6",
        "title": "Genética",
        "summary": "Leis de Mendel, tipos de herança, alelos múltiplos e letais, interações gênicas, herança poligênica e ligada ao sexo, ligação gênica e alterações cromossômicas.",
        "links": [
          {
            "label": "Toda Matéria — Leis de Mendel",
            "url": "https://www.todamateria.com.br/leis-de-mendel/"
          },
          {
            "label": "Toda Matéria — Interação gênica",
            "url": "https://www.todamateria.com.br/interacao-genica/"
          }
        ]
      },
      {
        "id": "bio-7",
        "title": "Biotecnologia",
        "summary": "DNA recombinante, transgênicos, terapia gênica, clonagem, células-tronco e produção de insumos biológicos.",
        "links": [
          {
            "label": "Toda Matéria — DNA recombinante",
            "url": "https://www.todamateria.com.br/dna-recombinante/"
          },
          {
            "label": "Toda Matéria — Terapia gênica",
            "url": "https://www.todamateria.com.br/terapia-genica/"
          }
        ]
      },
      {
        "id": "bio-8",
        "title": "Origem da vida e evolução",
        "summary": "Teorias sobre a origem da vida, teorias evolutivas, bases genéticas, processos evolutivos, tempo geológico e evolução humana.",
        "links": [
          {
            "label": "Toda Matéria — Teoria da evolução",
            "url": "https://www.todamateria.com.br/teoria-da-evolucao/"
          },
          {
            "label": "InfoEscola — Teorias evolucionistas",
            "url": "https://www.infoescola.com/biologia/teorias-evolucionistas/"
          }
        ]
      },
      {
        "id": "bio-9",
        "title": "Ecologia",
        "summary": "Ecossistemas, relações ecológicas, populações, ciclos biogeoquímicos, sucessão, biomas, desequilíbrios e ação humana.",
        "links": [
          {
            "label": "Toda Matéria — Relações ecológicas",
            "url": "https://www.todamateria.com.br/relacoes-ecologicas/"
          },
          {
            "label": "Toda Matéria — Ciclos biogeoquímicos",
            "url": "https://www.todamateria.com.br/ciclos-biogeoquimicos/"
          }
        ]
      },
      {
        "id": "bio-10",
        "title": "Anatomia, fisiologia e saúde humana",
        "summary": "Sistemas do corpo humano, doenças (causas, sintomas, prevenção e tratamento) e principais drogas e seus efeitos.",
        "links": [
          {
            "label": "Toda Matéria — Sistemas do corpo humano",
            "url": "https://www.todamateria.com.br/sistemas-do-corpo-humano/"
          },
          {
            "label": "Toda Matéria — Sistema endócrino",
            "url": "https://www.todamateria.com.br/sistema-endocrino/"
          }
        ]
      }
    ]
  },
  {
    "id": "quimica",
    "name": "Química",
    "group": "Ciências da Natureza",
    "intro": "A prova articula os conceitos químicos com tecnologia, meio ambiente, energia e alimentos, e exige domínio de representações, nomenclatura e cálculos.",
    "orientacoes": [
      "Domine primeiro o mol, a estequiometria e a leitura da tabela periódica, pois esses temas aparecem em quase todos os outros.",
      "Pratique cálculos de concentração, pH, equilíbrio e termoquímica com listas de exercícios progressivas.",
      "Em Química Orgânica, aprenda funções, nomenclatura e isomeria com muitos exemplos de moléculas reais.",
      "Estude o bloco ambiental (energia, combustíveis, poluição) lendo notícias e relatórios, já que a UFSC gosta de contextualizar.",
      "Revise unidades, conversões e algarismos significativos, que costumam causar erros bobos."
    ],
    "topics": [
      {
        "id": "qui-1",
        "title": "Fundamentos da química",
        "summary": "Fenômenos físicos e químicos, medidas e unidades, mol e massa molar, estados da matéria, misturas e métodos de separação.",
        "links": [
          {
            "label": "Toda Matéria — Fenômenos físicos e químicos",
            "url": "https://www.todamateria.com.br/fenomenos-fisicos-e-quimicos/"
          },
          {
            "label": "Manual da Química — Separação de misturas",
            "url": "https://www.manualdaquimica.com/quimica-geral/metodos-separacao-misturas.htm"
          }
        ]
      },
      {
        "id": "qui-2",
        "title": "Estrutura atômica",
        "summary": "Modelos atômicos, radioatividade, fissão e fusão, distribuição eletrônica, espectro eletromagnético e tabela periódica.",
        "links": [
          {
            "label": "Manual da Química — Evolução dos modelos atômicos",
            "url": "https://www.manualdaquimica.com/quimica-geral/evolucao-dos-modelos-atomicos.htm"
          },
          {
            "label": "Toda Matéria — Distribuição eletrônica",
            "url": "https://www.todamateria.com.br/distribuicao-eletronica/"
          }
        ]
      },
      {
        "id": "qui-3",
        "title": "Ligações químicas",
        "summary": "Ligações iônica e covalente, estruturas de Lewis, polaridade, forças intermoleculares e geometria molecular.",
        "links": [
          {
            "label": "Manual da Química — Ligações químicas",
            "url": "https://www.manualdaquimica.com/quimica-geral/ligacoes-quimicas.htm"
          },
          {
            "label": "Toda Matéria — Forças intermoleculares",
            "url": "https://www.todamateria.com.br/forcas-intermoleculares/"
          }
        ]
      },
      {
        "id": "qui-4",
        "title": "Funções químicas",
        "summary": "Ácidos, bases, sais, óxidos e hidretos, conceitos de Arrhenius, Brønsted-Lowry e Lewis, neutralização e propriedades da água.",
        "links": [
          {
            "label": "Toda Matéria — Funções inorgânicas",
            "url": "https://www.todamateria.com.br/funcoes-inorganicas/"
          },
          {
            "label": "Manual da Química — Funções inorgânicas",
            "url": "https://www.manualdaquimica.com/quimica-inorganica/funcoes-inorganicas.htm"
          }
        ]
      },
      {
        "id": "qui-5",
        "title": "Reações químicas e energia",
        "summary": "Leis das combinações, fórmulas, oxirredução, balanceamento, estequiometria e reagente limitante.",
        "links": [
          {
            "label": "Toda Matéria — Estequiometria",
            "url": "https://www.todamateria.com.br/estequiometria/"
          },
          {
            "label": "Manual da Química — Balanceamento por oxirredução",
            "url": "https://www.manualdaquimica.com/fisico-quimica/balanceamento-das-equacoes-oxirreducao.htm"
          }
        ]
      },
      {
        "id": "qui-6",
        "title": "Estados físicos e estrutura da matéria",
        "summary": "Sólidos, líquidos e gases, leis dos gases, gás ideal, pressões parciais, mudanças de estado e equilíbrio entre fases.",
        "links": [
          {
            "label": "Toda Matéria — Transformações gasosas",
            "url": "https://www.todamateria.com.br/transformacoes-gasosas/"
          },
          {
            "label": "Manual da Química — Equação de Clapeyron",
            "url": "https://www.manualdaquimica.com/quimica-geral/equacao-estado-dos-gases-equacao-clapeyron.htm"
          }
        ]
      },
      {
        "id": "qui-7",
        "title": "Soluções e propriedades coligativas",
        "summary": "Classificação e concentração de soluções, solubilidade, saturação, propriedades coligativas e osmose.",
        "links": [
          {
            "label": "Toda Matéria — Concentração de soluções",
            "url": "https://www.todamateria.com.br/concentracao-de-solucoes/"
          },
          {
            "label": "Toda Matéria — Propriedades coligativas",
            "url": "https://www.todamateria.com.br/propriedades-coligativas/"
          }
        ]
      },
      {
        "id": "qui-8",
        "title": "Termoquímica",
        "summary": "Calorimetria, reações exo e endotérmicas, entalpia, Lei de Hess e energia de ligação.",
        "links": [
          {
            "label": "Toda Matéria — Termoquímica",
            "url": "https://www.todamateria.com.br/termoquimica/"
          },
          {
            "label": "Manual da Química — Lei de Hess",
            "url": "https://www.manualdaquimica.com/fisico-quimica/lei-hess.htm"
          }
        ]
      },
      {
        "id": "qui-9",
        "title": "Cinética e equilíbrio químico",
        "summary": "Velocidade das reações, teoria das colisões, catalisadores, constantes de equilíbrio, Le Chatelier, produto de solubilidade, pH e hidrólise.",
        "links": [
          {
            "label": "Toda Matéria — Cinética química",
            "url": "https://www.todamateria.com.br/cinetica-quimica/"
          },
          {
            "label": "Manual da Química — Princípio de Le Chatelier",
            "url": "https://www.manualdaquimica.com/fisico-quimica/principio-le-chatelier.htm"
          }
        ]
      },
      {
        "id": "qui-10",
        "title": "Eletroquímica",
        "summary": "Potenciais de redução, pilhas, eletrólise e Leis de Faraday.",
        "links": [
          {
            "label": "Toda Matéria — Eletroquímica",
            "url": "https://www.todamateria.com.br/eletroquimica/"
          },
          {
            "label": "Manual da Química — Eletroquímica",
            "url": "https://www.manualdaquimica.com/fisico-quimica/eletroquimica.htm"
          }
        ]
      },
      {
        "id": "qui-11",
        "title": "Química orgânica",
        "summary": "Átomo de carbono, funções orgânicas, isomeria, polímeros e combustão.",
        "links": [
          {
            "label": "Toda Matéria — Química orgânica",
            "url": "https://www.todamateria.com.br/quimica-organica/"
          },
          {
            "label": "Toda Matéria — Isomeria",
            "url": "https://www.todamateria.com.br/isomeria/"
          }
        ]
      },
      {
        "id": "qui-13",
        "title": "Química aplicada e meio ambiente",
        "summary": "Impactos de recursos energéticos e minerais, combustíveis, petróleo, efeito estufa, chuva ácida, camada de ozônio, poluição e tratamento de resíduos.",
        "links": [
          {
            "label": "Toda Matéria — Química ambiental",
            "url": "https://www.todamateria.com.br/quimica-ambiental-o-que-e-e-o-que-estuda-com-exercicios/"
          },
          {
            "label": "Toda Matéria — Biocombustíveis",
            "url": "https://www.todamateria.com.br/biocombustiveis/"
          }
        ]
      }
    ]
  },
  {
    "id": "fisica",
    "name": "Física",
    "group": "Ciências da Natureza",
    "intro": "Espera-se compreensão das leis fundamentais e domínio da matemática necessária para aplicá-las, com leitura de gráficos, tabelas e textos científicos.",
    "orientacoes": [
      "Faça a ponte com a Matemática: revise proporção, funções, trigonometria básica e vetores antes de avançar.",
      "Antes de aplicar fórmula, descreva o fenômeno com palavras e desenhe o esquema da situação.",
      "Trabalhe as unidades em todas as contas; muitos erros vêm de conversão.",
      "Dê atenção a Mecânica e Eletricidade, que concentram a maior parte do conteúdo, sem deixar Termologia e Ondas de lado.",
      "Interprete gráficos (posição x tempo, pressão x volume, tensão x corrente) como se fossem textos.",
      "Leia sobre a história da Física e sobre aplicações tecnológicas, pois o programa pede esse contexto."
    ],
    "topics": [
      {
        "id": "fis-mec-1",
        "title": "Grandezas físicas e medidas",
        "summary": "Sistema Internacional, potências de dez, algarismos significativos, gráficos e escalas, grandezas vetoriais e operações com vetores.",
        "links": [
          {
            "label": "Toda Matéria — Grandezas físicas",
            "url": "https://www.todamateria.com.br/grandezas-fisicas-o-que-sao-e-tipos-com-exemplos-e-exercicios/"
          },
          {
            "label": "Manual do Enem — Sistema Internacional de Unidades",
            "url": "https://querobolsa.com.br/enem/fisica/sistema-internacional-de-unidades"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-2",
        "title": "Cinemática",
        "summary": "Referencial, velocidade e aceleração, MRU, MRUV, queda livre, movimento circular uniforme e composição de movimentos.",
        "links": [
          {
            "label": "Toda Matéria — Movimento retilíneo uniforme",
            "url": "https://www.todamateria.com.br/movimento-retilineo-uniforme/"
          },
          {
            "label": "Toda Matéria — MRUV",
            "url": "https://www.todamateria.com.br/movimento-retilineo-uniformemente-variado/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-3",
        "title": "Leis de Newton",
        "summary": "Força, três leis, peso, atrito, equilíbrio de corpo rígido, momento de força e forças em trajetórias curvas.",
        "links": [
          {
            "label": "Toda Matéria — Leis de Newton",
            "url": "https://www.todamateria.com.br/leis-de-newton/"
          },
          {
            "label": "Física Interativa — Aplicações das leis de Newton",
            "url": "https://fisicainterativa.com/aplicacoes-das-leis-de-newton/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-4",
        "title": "Conservação da energia",
        "summary": "Trabalho, potência, energia cinética e potencial, Lei de Hooke, forças conservativas e dissipativas e fontes renováveis.",
        "links": [
          {
            "label": "InfoEscola — Conservação de energia",
            "url": "https://www.infoescola.com/fisica/lei-da-conservacao-de-energia/"
          },
          {
            "label": "Prof. Ferretto — Energia potencial elástica",
            "url": "https://blog.professorferretto.com.br/fisica/energia-potencial-elastica/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-5",
        "title": "Conservação da quantidade de movimento",
        "summary": "Impulso, quantidade de movimento, sistemas de partículas e colisões.",
        "links": [
          {
            "label": "Toda Matéria — Quantidade de movimento",
            "url": "https://www.todamateria.com.br/quantidade-de-movimento/"
          },
          {
            "label": "Toda Matéria — Impulso",
            "url": "https://www.todamateria.com.br/impulso/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-6",
        "title": "Gravitação universal",
        "summary": "Leis de Kepler, gravitação, variação da gravidade e órbitas de satélites.",
        "links": [
          {
            "label": "Toda Matéria — Leis de Kepler",
            "url": "https://www.todamateria.com.br/leis-de-kepler/"
          },
          {
            "label": "Curso Enem Gratuito — Leis de Kepler e gravitação",
            "url": "https://cursoenemgratuito.com.br/leis-de-kepler/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-mec-7",
        "title": "Hidrostática",
        "summary": "Densidade, pressão, Torricelli, Lei de Stevin, princípios de Pascal e de Arquimedes.",
        "links": [
          {
            "label": "Toda Matéria — Princípio de Pascal",
            "url": "https://www.todamateria.com.br/principio-de-pascal/"
          },
          {
            "label": "FisicaNET — Hidrostática",
            "url": "https://www.fisica.net/hidrostatica/"
          }
        ],
        "group": "Mecânica"
      },
      {
        "id": "fis-ter-1",
        "title": "Temperatura e dilatação",
        "summary": "Equilíbrio térmico, escalas termométricas e dilatação de sólidos e líquidos, incluindo o comportamento anômalo da água.",
        "links": [
          {
            "label": "Toda Matéria — Termologia",
            "url": "https://www.todamateria.com.br/fisica/termologia/"
          },
          {
            "label": "Estratégia — Dilatação térmica e escalas",
            "url": "https://vestibulares.estrategia.com/portal/materias/fisica/termologia-dilatacao-termica-escalas-termometricas-e-mais/"
          }
        ],
        "group": "Termologia"
      },
      {
        "id": "fis-ter-2",
        "title": "Comportamento dos gases",
        "summary": "Transformações gasosas, Lei de Avogadro, gás ideal e interpretação cinética da temperatura.",
        "links": [
          {
            "label": "Seu Saber — Gás ideal",
            "url": "https://seusaber.com.br/gas-ideal-resumo-aula-e-exercicios/"
          },
          {
            "label": "Seu Saber — Equação de Clapeyron",
            "url": "https://seusaber.com.br/estado-de-um-gas-e-a-equacao-de-clapeyron-resumo-aula-e-exercicios/"
          }
        ],
        "group": "Termologia"
      },
      {
        "id": "fis-ter-3",
        "title": "Leis da termodinâmica",
        "summary": "Calor, transferência, calor específico, primeira e segunda leis, rendimento de máquinas térmicas e ciclo de Carnot.",
        "links": [
          {
            "label": "Toda Matéria — Segunda lei da termodinâmica",
            "url": "https://www.todamateria.com.br/segunda-lei-da-termodinamica/"
          },
          {
            "label": "InfoEscola — Segunda lei da termodinâmica",
            "url": "https://www.infoescola.com/fisica/segunda-lei-da-termodinamica/"
          }
        ],
        "group": "Termologia"
      },
      {
        "id": "fis-ter-4",
        "title": "Mudanças de fase",
        "summary": "Fusão, vaporização, sublimação, influência da pressão e diagramas de fases.",
        "links": [
          {
            "label": "Toda Matéria — Mudanças de estado físico",
            "url": "https://www.todamateria.com.br/mudancas-estado-fisico/"
          },
          {
            "label": "EducaBras — Mudanças de estado e diagrama de fases",
            "url": "https://www.educabras.com/vestibular/materia/fisica/termologia/aulas/mudancas_de_estado_diagrama_de_fases"
          }
        ],
        "group": "Termologia"
      },
      {
        "id": "fis-ond-1",
        "title": "Ótica geométrica",
        "summary": "Reflexão e refração, espelhos planos e esféricos, reflexão total, prismas, lentes e ótica da visão.",
        "links": [
          {
            "label": "Toda Matéria — Espelhos esféricos",
            "url": "https://www.todamateria.com.br/espelhos-esfericos/"
          },
          {
            "label": "Toda Matéria — Lentes esféricas",
            "url": "https://www.todamateria.com.br/lentes-esfericas/"
          }
        ],
        "group": "Ótica e Ondas"
      },
      {
        "id": "fis-ond-2",
        "title": "Movimento ondulatório",
        "summary": "MHS, pêndulo simples, tipos e elementos de onda, interferência, difração e natureza ondulatória da luz.",
        "links": [
          {
            "label": "Toda Matéria — Movimento harmônico simples",
            "url": "https://www.todamateria.com.br/movimento-harmonico-simples/"
          },
          {
            "label": "Toda Matéria — Ondas",
            "url": "https://www.todamateria.com.br/ondas/"
          }
        ],
        "group": "Ótica e Ondas"
      },
      {
        "id": "fis-ond-3",
        "title": "Ondas sonoras",
        "summary": "Som como onda mecânica, infrassom e ultrassom, velocidade, qualidades do som e efeito Doppler.",
        "links": [
          {
            "label": "Toda Matéria — Ondas sonoras",
            "url": "https://www.todamateria.com.br/ondas-sonoras/"
          },
          {
            "label": "Toda Matéria — Efeito Doppler",
            "url": "https://www.todamateria.com.br/efeito-doppler/"
          }
        ],
        "group": "Ótica e Ondas"
      },
      {
        "id": "fis-ele-1",
        "title": "Carga elétrica",
        "summary": "Eletrização, condutores e isolantes, indução, eletroscópios e Lei de Coulomb.",
        "links": [
          {
            "label": "Toda Matéria — Carga elétrica",
            "url": "https://www.todamateria.com.br/carga-eletrica/"
          },
          {
            "label": "Toda Matéria — Lei de Coulomb",
            "url": "https://www.todamateria.com.br/lei-de-coulomb/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-2",
        "title": "Campo elétrico",
        "summary": "Campo de cargas puntuais, linhas de força, blindagem eletrostática e poder das pontas.",
        "links": [
          {
            "label": "Toda Matéria — Campo elétrico",
            "url": "https://www.todamateria.com.br/campo-eletrico/"
          },
          {
            "label": "Toda Matéria — Exercícios de eletrostática",
            "url": "https://www.todamateria.com.br/eletrostatica-exercicios/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-3",
        "title": "Potencial elétrico",
        "summary": "Diferença de potencial, campo uniforme, superfícies equipotenciais e condutores em contato.",
        "links": [
          {
            "label": "Toda Matéria — Potencial elétrico",
            "url": "https://www.todamateria.com.br/potencial-eletrico/"
          },
          {
            "label": "InfoEscola — Potencial elétrico",
            "url": "https://www.infoescola.com/fisica/potencial-eletrico/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-4",
        "title": "Capacitores",
        "summary": "Capacitância, dielétrico, associação e energia armazenada.",
        "links": [
          {
            "label": "Toda Matéria — Capacitores",
            "url": "https://www.todamateria.com.br/capacitores/"
          },
          {
            "label": "InfoEscola — Associação de capacitores",
            "url": "https://www.infoescola.com/eletricidade/associacao-de-capacitores/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-5",
        "title": "Corrente elétrica",
        "summary": "Circuitos simples, resistência, Lei de Ohm, associação de resistores, medidores e potência.",
        "links": [
          {
            "label": "Toda Matéria — Leis de Ohm",
            "url": "https://www.todamateria.com.br/leis-de-ohm/"
          },
          {
            "label": "Toda Matéria — Associação de resistores",
            "url": "https://www.todamateria.com.br/associacao-de-resistores/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-6",
        "title": "Circuitos elétricos",
        "summary": "Geradores, força eletromotriz, equação do circuito e receptores.",
        "links": [
          {
            "label": "Toda Matéria — Geradores elétricos",
            "url": "https://www.todamateria.com.br/geradores-eletricos/"
          },
          {
            "label": "PrePara Enem — Lei de Pouillet",
            "url": "https://www.preparaenem.com/fisica/lei-pouillet.htm"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-7",
        "title": "Campo magnético",
        "summary": "Ímãs, experiência de Oersted, força magnética, campo de fio e de solenoide.",
        "links": [
          {
            "label": "Toda Matéria — Campo magnético",
            "url": "https://www.todamateria.com.br/campo-magnetico/"
          },
          {
            "label": "Toda Matéria — Força magnética",
            "url": "https://www.todamateria.com.br/forca-magnetica/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-ele-8",
        "title": "Indução eletromagnética e ondas eletromagnéticas",
        "summary": "Leis de Faraday e de Lenz, geradores, transformadores, espectro eletromagnético e transmissão de energia.",
        "links": [
          {
            "label": "Toda Matéria — Indução eletromagnética",
            "url": "https://www.todamateria.com.br/inducao-eletromagnetica/"
          },
          {
            "label": "Toda Matéria — Lei de Faraday",
            "url": "https://www.todamateria.com.br/lei-de-faraday/"
          }
        ],
        "group": "Eletricidade e Eletromagnetismo"
      },
      {
        "id": "fis-mod-1",
        "title": "Noções de Física Moderna",
        "summary": "Limites da mecânica clássica, relatividade, efeito fotoelétrico e dualidade onda-partícula.",
        "links": [
          {
            "label": "Toda Matéria — Física moderna",
            "url": "https://www.todamateria.com.br/fisica-moderna/"
          },
          {
            "label": "InfoEscola — Dualidade onda-partícula",
            "url": "https://www.infoescola.com/fisica/dualidade-onda-particula/"
          }
        ],
        "group": "Física Moderna"
      }
    ]
  },
  {
    "id": "historia",
    "name": "História",
    "group": "Ciências Humanas e Sociais",
    "intro": "O programa se alinha à BNCC e valoriza análise de fontes, noção de tempo e espaço, contextualização e leitura crítica, e não apenas memorização de datas.",
    "orientacoes": [
      "Estude por processos e causas (por que aconteceu, quem ganhou e quem perdeu), e não por listas de fatos.",
      "Aprenda a analisar fontes: quem produziu, quando, para quem e com que intenção.",
      "Monte linhas do tempo que conectem Brasil, América e mundo, pois a prova cruza essas escalas.",
      "Dê atenção especial à História de Santa Catarina e do Brasil República, com Era Vargas, Ditadura Militar e redemocratização.",
      "Use as leituras complementares indicadas no programa, sobretudo Hobsbawm e \"Brasil: uma biografia\", para aprofundar."
    ],
    "topics": [
      {
        "id": "his-1",
        "title": "Fontes e escrita da história",
        "summary": "Como historiadores usam fontes e constroem narrativas.",
        "links": [
          {
            "label": "Toda Matéria — Fontes históricas",
            "url": "https://www.todamateria.com.br/fontes-historicas/"
          },
          {
            "label": "Wikipédia — Historiografia",
            "url": "https://pt.wikipedia.org/wiki/Historiografia"
          }
        ]
      },
      {
        "id": "his-2",
        "title": "Ásia, Europa, África e Oceania",
        "summary": "Mundo Antigo, Idade Média, navegações, Reformas, Iluminismo, Revolução Francesa e Industrial, imperialismo, totalitarismos, Guerra Fria e globalização.",
        "links": [
          {
            "label": "Toda Matéria — Idade Média",
            "url": "https://www.todamateria.com.br/idade-media/"
          },
          {
            "label": "Toda Matéria — Revolução Industrial",
            "url": "https://www.todamateria.com.br/revolucao-industrial/"
          }
        ]
      },
      {
        "id": "his-3",
        "title": "América",
        "summary": "Civilizações pré-colombianas, conquista e colonização, independências e América contemporânea.",
        "links": [
          {
            "label": "Toda Matéria — Incas, astecas e maias",
            "url": "https://www.todamateria.com.br/incas-astecas-e-maias/"
          },
          {
            "label": "Wikipédia — História da América",
            "url": "https://pt.wikipedia.org/wiki/Hist%C3%B3ria_da_Am%C3%A9rica"
          }
        ]
      },
      {
        "id": "his-4",
        "title": "Brasil e Santa Catarina",
        "summary": "Sociedades indígenas, colônia, Império, escravidão, República, Revolução de 1930, pós-guerra, Ditadura Militar, redemocratização e Brasil atual.",
        "links": [
          {
            "label": "Toda Matéria — História do Brasil",
            "url": "https://www.todamateria.com.br/historia-do-brasil/"
          },
          {
            "label": "InfoEscola — História de Santa Catarina",
            "url": "https://www.infoescola.com/santa-catarina/historia-de-santa-catarina/"
          }
        ]
      }
    ]
  },
  {
    "id": "geografia",
    "name": "Geografia",
    "group": "Ciências Humanas e Sociais",
    "intro": "A prova exige observação, análise de mapas e dados e visão interdisciplinar do espaço mundial, brasileiro e catarinense. O conhecimento sobre Santa Catarina é um diferencial da UFSC.",
    "orientacoes": [
      "Treine leitura de mapas, gráficos, pirâmides etárias e tabelas de indicadores; isso aparece em boa parte das questões.",
      "Estude cada tema em três escalas, mundo, Brasil e Santa Catarina, como o programa pede.",
      "Use o Atlas Geográfico de Santa Catarina da UDESC, indicado no programa, para dados regionais.",
      "Relacione fenômenos naturais com problemas ambientais e com uso econômico do espaço.",
      "Acompanhe notícias sobre geopolítica, blocos econômicos e migrações, pois entram como contexto atual."
    ],
    "topics": [
      {
        "id": "geo-1",
        "title": "Globo terrestre e cartografia",
        "summary": "Movimentos da Terra, coordenadas, fusos, projeções, mapas, geotecnologias e localização do Brasil e de Santa Catarina.",
        "links": [
          {
            "label": "Brasil Escola — Movimentos da Terra",
            "url": "https://brasilescola.uol.com.br/geografia/movimentos-terra.htm"
          },
          {
            "label": "Toda Matéria — Coordenadas geográficas",
            "url": "https://www.todamateria.com.br/coordenadas-geograficas/"
          }
        ]
      },
      {
        "id": "geo-2",
        "title": "Dinâmica da natureza",
        "summary": "Litosfera, atmosfera, hidrosfera e biosfera, grandes paisagens e problemas ambientais globais.",
        "links": [
          {
            "label": "Toda Matéria — Litosfera",
            "url": "https://www.todamateria.com.br/litosfera/"
          },
          {
            "label": "Brasil Escola — Litosfera",
            "url": "https://brasilescola.uol.com.br/geografia/litosfera.htm"
          }
        ]
      },
      {
        "id": "geo-3",
        "title": "Aspectos naturais do Brasil e de Santa Catarina",
        "summary": "Geologia, relevo, clima, hidrografia, vegetação, domínios morfoclimáticos e biomas.",
        "links": [
          {
            "label": "Brasil Escola — Biomas brasileiros",
            "url": "https://brasilescola.uol.com.br/brasil/biomas-brasileiros.htm"
          },
          {
            "label": "Toda Matéria — Domínios morfoclimáticos",
            "url": "https://www.todamateria.com.br/dominios-morfoclimaticos/"
          }
        ]
      },
      {
        "id": "geo-4",
        "title": "Demografia",
        "summary": "Estrutura da população, etnias, crescimento, indicadores socioeconômicos, distribuição de renda e migrações.",
        "links": [
          {
            "label": "Toda Matéria — Demografia",
            "url": "https://www.todamateria.com.br/demografia/"
          },
          {
            "label": "Toda Matéria — Pirâmide etária",
            "url": "https://www.todamateria.com.br/piramide-etaria/"
          }
        ]
      },
      {
        "id": "geo-5",
        "title": "Urbanização",
        "summary": "Conceitos urbanos, pobreza e violência, industrialização, energia, transporte, comércio e serviços.",
        "links": [
          {
            "label": "Toda Matéria — Urbanização",
            "url": "https://www.todamateria.com.br/urbanizacao/"
          },
          {
            "label": "Wikipédia — Urbanização",
            "url": "https://pt.wikipedia.org/wiki/Urbaniza%C3%A7%C3%A3o"
          }
        ]
      },
      {
        "id": "geo-6",
        "title": "Espaço agrário",
        "summary": "Agricultura, pecuária, extrativismo, problemas ambientais, estrutura fundiária e reforma agrária.",
        "links": [
          {
            "label": "Toda Matéria — Estrutura fundiária",
            "url": "https://www.todamateria.com.br/estrutura-fundiaria-o-que-e-caracteristicas-e-exemplos-no-brasil/"
          },
          {
            "label": "InfoEscola — Estrutura fundiária",
            "url": "https://www.infoescola.com/agricultura/estrutura-fundiaria/"
          }
        ]
      },
      {
        "id": "geo-7",
        "title": "Regionalizações do Brasil e de Santa Catarina",
        "summary": "Critérios de divisão regional e características de cada região.",
        "links": [
          {
            "label": "Brasil Escola — Regiões brasileiras",
            "url": "https://brasilescola.uol.com.br/brasil/regioes-brasileiras.htm"
          },
          {
            "label": "Atlas Geográfico de Santa Catarina (UDESC)",
            "url": "https://www.udesc.br/faed/geografia/atlasgeografico"
          }
        ]
      },
      {
        "id": "geo-8",
        "title": "Espaço mundial contemporâneo",
        "summary": "Polos de poder, blocos econômicos, países emergentes e geopolítica atual.",
        "links": [
          {
            "label": "Toda Matéria — Blocos econômicos",
            "url": "https://www.todamateria.com.br/blocos-economicos/"
          },
          {
            "label": "Toda Matéria — Geopolítica",
            "url": "https://www.todamateria.com.br/geopolitica/"
          }
        ]
      }
    ]
  },
  {
    "id": "filosofia",
    "name": "Filosofia",
    "group": "Ciências Humanas e Sociais",
    "intro": "O programa de 2027 se concentra na leitura de dois clássicos da filosofia política, e a prova avalia se você compreendeu os textos e seus conceitos.",
    "orientacoes": [
      "Leia os textos indicados, e não só resumos: a prova parte do que está escrito.",
      "Para cada capítulo, anote a ideia central, os conceitos principais e como o autor encadeia o argumento.",
      "Compare Maquiavel e Hobbes: concepção de ser humano, origem e função do Estado, papel do soberano.",
      "Treine explicar cada conceito com suas próprias palavras e aplicar a exemplos contemporâneos."
    ],
    "topics": [
      {
        "id": "fil-1",
        "title": "Maquiavel, O Príncipe",
        "summary": "Leitura da obra completa, com atenção ao poder político, à virtù e à fortuna e à relação entre política e moral.",
        "links": [
          {
            "label": "Wikipédia — O Príncipe",
            "url": "https://pt.wikipedia.org/wiki/O_Pr%C3%ADncipe"
          },
          {
            "label": "Toda Matéria — Maquiavel",
            "url": "https://www.todamateria.com.br/maquiavel/"
          }
        ]
      },
      {
        "id": "fil-2",
        "title": "Hobbes, Leviatã",
        "summary": "Capítulo XIII (condição natural da humanidade), XVII (origem e definição do Estado) e XVIII (direitos dos soberanos por instituição).",
        "links": [
          {
            "label": "Wikipédia — Leviatã",
            "url": "https://pt.wikipedia.org/wiki/Leviat%C3%A3_(livro)"
          },
          {
            "label": "Toda Matéria — Thomas Hobbes",
            "url": "https://www.todamateria.com.br/thomas-hobbes/"
          }
        ]
      }
    ]
  },
  {
    "id": "sociologia",
    "name": "Sociologia",
    "group": "Ciências Humanas e Sociais",
    "intro": "A prova quer ver se você analisa criticamente o mundo social usando diferentes perspectivas teóricas e fontes de informação.",
    "orientacoes": [
      "Aprenda conceitos com exemplos concretos do Brasil atual, como desigualdade, racismo, gênero, trabalho e cidadania.",
      "Conheça a tradição sociológica brasileira e os clássicos que a inspiram.",
      "Leia notícias e dados de institutos de pesquisa e pratique interpretá-los sociologicamente.",
      "Treine articular conceitos diferentes em uma mesma análise, pois a prova tende a cruzar temas."
    ],
    "topics": [
      {
        "id": "soc-1",
        "title": "Indivíduo, sociedade e ambiente",
        "summary": "Integração social, papéis sociais, identidade e interação entre indivíduos, grupos e ambiente.",
        "links": [
          {
            "label": "Wikipédia — Papel social",
            "url": "https://pt.wikipedia.org/wiki/Papel_social"
          },
          {
            "label": "Toda Matéria — Estrutura social",
            "url": "https://www.todamateria.com.br/estrutura-social/"
          }
        ]
      },
      {
        "id": "soc-2",
        "title": "Desigualdades e marcadores de diferença",
        "summary": "Estratificação social, desigualdades de gênero, relações raciais no Brasil e políticas públicas.",
        "links": [
          {
            "label": "Toda Matéria — Estratificação social",
            "url": "https://www.todamateria.com.br/sociedade-estratificada/"
          },
          {
            "label": "Wikipédia — Desigualdade de gênero",
            "url": "https://pt.wikipedia.org/wiki/Desigualdade_de_g%C3%AAnero"
          }
        ]
      },
      {
        "id": "soc-3",
        "title": "Instituições, relações de poder e formas políticas",
        "summary": "Legitimidade e soberania do Estado, público e privado, democracia e autoritarismo, cidadania.",
        "links": [
          {
            "label": "Toda Matéria — Democracia",
            "url": "https://www.todamateria.com.br/democracia/"
          },
          {
            "label": "Toda Matéria — Cidadania",
            "url": "https://www.todamateria.com.br/cidadania/"
          }
        ]
      },
      {
        "id": "soc-4",
        "title": "Cultura, diversidade e diferença",
        "summary": "Tradição e mudança, pluralidade e intolerância, movimentos sociais, direitos e mundo do trabalho.",
        "links": [
          {
            "label": "Toda Matéria — Movimentos sociais",
            "url": "https://www.todamateria.com.br/movimentos-sociais/"
          },
          {
            "label": "Wikipédia — Movimento social",
            "url": "https://pt.wikipedia.org/wiki/Movimento_social"
          }
        ]
      },
      {
        "id": "soc-5",
        "title": "Sociedade e Sociologia no Brasil",
        "summary": "Tradição sociológica brasileira, culturas afro-brasileiras e indígenas, etnocentrismo e relativismo cultural.",
        "links": [
          {
            "label": "Toda Matéria — Etnocentrismo",
            "url": "https://www.todamateria.com.br/etnocentrismo/"
          },
          {
            "label": "Wikipédia — Relativismo cultural",
            "url": "https://pt.wikipedia.org/wiki/Relativismo_cultural"
          }
        ]
      }
    ]
  }
]
