import api from './client';

export interface InstitutionOption {
  id: number;
  name: string;
}

export async function searchInstitutions(query: string) {
  const { data } = await api.get<InstitutionOption[]>('/institutions/public', {
    params: { q: query },
  });
  return data;
}
