export interface ProspectSearchQuery {
  business: string;
  lookingFor: string;
  industry: string;
  location: string;
  companySize: string;
  keywords: string;
  userId: string;
}

export interface ProspectMatch {
  id: string;
  company: string;
  industry: string;
  location: string;
  website: string;
  email: string;
  reason: string;
}

export interface ProspectSearchResponse {
  summary?: string;
  prospects?: unknown[];
  results?: unknown[];
  matches?: unknown[];
  companies?: unknown[];
  items?: unknown[];
  data?: unknown[];
}
