"""Lista padrão de componentes curriculares (BNCC) para ensino fundamental e médio.

Usada para popular as matérias de uma instituição automaticamente na criação
(e retroativamente, via migração, para instituições que já existem e ainda
não têm essa lista completa). Cada escola pode adicionar/remover matérias
livremente depois — isso é só o ponto de partida.
"""

STANDARD_SUBJECTS = [
    "Língua Portuguesa",
    "Matemática",
    "Ciências",
    "Biologia",
    "Física",
    "Química",
    "História",
    "Geografia",
    "Arte",
    "Educação Física",
    "Língua Inglesa",
    "Espanhol",
    "Ensino Religioso",
    "Sociologia",
    "Filosofia",
    "Redação",
]
