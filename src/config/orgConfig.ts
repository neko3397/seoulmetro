import config from '../../org.config.json';

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export interface CareerOption {
  value: string;
  label: string;
  description: string;
}

export interface OrgConfig {
  organization: {
    name: string;
    shortName: string;
    appTitle: string;
    description: string;
    loginMessage: string;
    adminTitle: string;
    headerTitle: string;
    footerText: string;
  };
  supabase: {
    projectId: string;
    anonKey: string;
    region: string;
  };
  vercel: {
    projectName: string;
  };
  ai: {
    enabled: boolean;
    openaiApiKey: string;
    chatModel: string;
    embeddingModel: string;
    dailyQuestionLimit: number;
  };
  youtube: {
    enabled: boolean;
    channelImport: boolean;
    defaultCategoryName: string;
    googleClientId: string;
    googleClientSecret: string;
  };
  branding: {
    themeColor: string;
    backgroundColor: string;
  };
  roles: {
    options: RoleOption[];
    careerStages: CareerOption[];
  };
}

export const orgConfig: OrgConfig = config as OrgConfig;
