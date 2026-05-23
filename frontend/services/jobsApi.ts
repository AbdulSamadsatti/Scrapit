// frontend/services/jobsApi.ts
import { getBaseUrl } from '@/utils/getBaseUrl';

export interface Job {
  // Core fields
  title: string;
  company: string;
  location: string;
  // Optional enriched fields
  logo?: string;
  banner?: string;
  snippet?: string;
  description?: string;
  salary?: string;
  apply_link?: string;
  source?: string;
  source_label?: string;
  posted_at?: string;
  job_id?: string;
  // Alias fields (from JobCard)
  image?: string;
  thumbnail?: string;
  link?: string;
  direct_url?: string;
  id?: string;
}

/**
 * Fetch jobs from the backend.
 * @param query Search query string (e.g., "python developer")
 * @param maxJobs  Max results to return (default 25)
 * @param excludeGoogle  Strip Google Jobs results
 * @returns Array of Job objects sorted by source priority
 */
export const getJobs = async (
  query: string,
  maxJobs: number = 25,
  excludeGoogle: boolean = false,
  forceRefresh: boolean = false
): Promise<Job[]> => {
  const base = getBaseUrl();
  let url =
    `${base}/api/jobs` +
    `?q=${encodeURIComponent(query)}` +
    `&max_jobs=${maxJobs}` +
    `&exclude_google=${excludeGoogle}`;
  if (forceRefresh) {
    url += `&force_scrape=true`;
  }
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
