export interface CmsSecrets {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export type CmsEnv = Env & CmsSecrets;

export interface SessionData {
  user: string;
  avatar: string;
  token: string;
  permission: 'write' | 'maintain' | 'admin';
  createdAt: number;
}

export interface AuthContext extends SessionData {
  sessionId: string;
}
