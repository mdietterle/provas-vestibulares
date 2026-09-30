// Registro dos guias de estudo por universidade (slug -> guia). Cada arquivo
// em ./<slug>.ts exporta `guide`; ao criar um novo, adicione-o aqui em ordem
// alfabética (import + entrada no objeto).
import type { StudyGuide } from '../studyGuideTypes'
import { guide as cebraspe } from './cebraspe'
import { guide as enem } from './enem'
import { guide as fuvest } from './fuvest'
import { guide as pucminas } from './pucminas'
import { guide as pucpr } from './pucpr'
import { guide as pucrio } from './pucrio'
import { guide as ufba } from './ufba'
import { guide as ufc } from './ufc'
import { guide as ufgd } from './ufgd'
import { guide as ufpe } from './ufpe'
import { guide as ufrn } from './ufrn'
import { guide as ufsc } from './ufsc'
import { guide as ufsm } from './ufsm'
import { guide as ulbra } from './ulbra'
import { guide as upf } from './upf'

export const STUDY_GUIDES: Record<string, StudyGuide> = {
  cebraspe,
  enem,
  fuvest,
  pucminas,
  pucpr,
  pucrio,
  ufba,
  ufc,
  ufgd,
  ufpe,
  ufrn,
  ufsc,
  ufsm,
  ulbra,
  upf,
}

export function getStudyGuide(slug: string): StudyGuide | undefined {
  return STUDY_GUIDES[slug]
}
