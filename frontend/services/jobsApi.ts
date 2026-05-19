// frontend/services/jobsApi.ts
import { getBaseUrl } from '@/utils/getBaseUrl';

export interface Job {
  title: string;
  company: string;
  location: string;
  thumbnail?: string;
  apply_options?: any[];
  source?: string;
  job_id?: string;
}

/**
 * Fetch jobs from the backend.
 * @param query Search query string (e.g., "python developer")
 * @returns Array of Job objects
 */
export const getJobs = async (query: string): Promise<Job[]> => {
  const base = getBaseUrl();
  const url = `${base}/api/jobs?query=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    // API returns { status, total_results, jobs }
    return data.jobs ?? [];
  } catch (err) {
    console.error('Failed to fetch jobs:', err);
    throw err;
  }
};
