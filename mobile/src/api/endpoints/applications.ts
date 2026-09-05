import { apiFetch } from '../http';
import type { Application, PodcastLanguage } from '../types';

export async function listApplications(): Promise<Application[]> {
  const { data } = await apiFetch<Application[]>('/applications');
  return data;
}

export async function createApplication(input: {
  name: string;
  description?: string;
  language?: PodcastLanguage;
}): Promise<Application> {
  const { data } = await apiFetch<Application>('/applications', {
    method: 'POST',
    body: input,
  });
  return data;
}
