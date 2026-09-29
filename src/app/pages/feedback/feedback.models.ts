export interface Feedback {
  id: string;
  source: string;
  email: string;
  status: string;
  name: string;
  description: string;
  userId: string;
  timestamp: string;
}

export interface FeedbackResponse {
  success?: boolean;
  message?: string;
  id?: string;
}

export interface FeedbackListResponse {
  feedbacks?: Feedback[];
  Items?: Record<string, unknown>[];
  LastEvaluatedKey?: Record<string, unknown>;
}
