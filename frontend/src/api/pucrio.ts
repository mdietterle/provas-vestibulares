import { api } from './index';

export interface ImportResult {
  exam_name: string;
  total_parsed?: number;
  total_added?: number;
  skipped_existing?: number;
  skipped?: boolean;
  reason?: string;
}

export interface ImportResponse {
  total_links_found?: number;
  total_added: number;
  exams: ImportResult[];
  error?: string;
}

export const pucrioApi = {
  runImportAll: async (since?: number, until?: number): Promise<ImportResponse> => {
    const params = { since_year: since, until_year: until };
    const response = await api.post('/pucrio-questions/admin/import-all', null, { params });
    return response.data;
  },
};
