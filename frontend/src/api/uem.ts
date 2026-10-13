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

export const uemApi = {
  runImportAll: async (since?: number, until?: number, forceReimport = false, examName?: string): Promise<ImportResponse> => {
    const params = { since_year: since, until_year: until, force_reimport: forceReimport, exam_name: examName };
    const response = await api.post('/uem/import', null, { params });
    return response.data;
  },

  getExamVersions: (year?: number) => api.get<string[]>(`/uem/admin/exam-versions`, { params: { year } }),
};
