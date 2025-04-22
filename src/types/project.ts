import type { Database } from '@/integrations/supabase/types';

// Project Types
export type ProjectRole = Database['public']['Enums']['project_role'];
export type ProjectStatus = Database['public']['Enums']['project_status'];
export type ProjectType = Database['public']['Enums']['project_type'];

export interface Project {
  id: number;
  name: string;
  description: string | null;
  type: ProjectType;
  status: ProjectStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
  source_language: string;
  target_languages: string[];
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  require_validation?: boolean;
  auto_assign?: boolean;
  default_priority?: PriorityLevel;
  [key: string]: unknown;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: string;
  role: ProjectRole;
  created_at: string;
  user_profile?: {
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface ProjectMetrics {
  tasks: number;
  completedTasks: number;
  contributions: number;
  validContributions: number;
  members: number;
}

// Task Types
export type TaskStatus = Database['public']['Enums']['task_status'];
export type PriorityLevel = Database['public']['Enums']['priority_level'];

export interface BaseTaskContent {
  task_title: string;
  batch_name?: string;
  domain?: string;
  instructions?: string;
  deadline?: string;
  [key: string]: unknown;
}

export interface TranslationTaskContent extends BaseTaskContent {
  source_text: string;
  source_language: string;
}

export interface TranscriptionTaskContent extends BaseTaskContent {
  audio_url: string;
}

export interface TTSTaskContent extends BaseTaskContent {
  text_to_speak: string;
}

export type TaskContent = TranslationTaskContent | TranscriptionTaskContent | TTSTaskContent;

export interface Task {
  id: number;
  project_id: number;
  type: ProjectType;
  language: string;
  content: TaskContent;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  assigned_to?: string;
  priority: PriorityLevel;
}

export interface TaskWithRelations extends Task {
  projects?: Pick<Project, 'id' | 'name' | 'source_language' | 'target_languages'>;
  created_by_user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  assigned_to_user?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  task_status_history?: TaskStatusHistory[];
}

export interface TaskStatusHistory {
  id: number;
  task_id: number;
  from_status: TaskStatus | null;
  to_status: TaskStatus;
  changed_at: string;
  changed_by: string;
  notes?: string;
  changed_by_user?: {
    id: string;
    name: string;
    email: string;
  };
}

// Contribution Types
export type ContributionStatus = Database['public']['Enums']['contribution_status'];

export interface Contribution {
  id: number;
  task_id: number;
  user_id: string;
  status: ContributionStatus;
  created_at: string;
  updated_at: string;
  content?: Record<string, unknown>;
  feedback?: string;
}

export interface ContributionWithTask extends Contribution {
  tasks: Task;
}

// Task Upload Types
export interface TaskBatchResult {
  success: number;
  failed: number;
  errors: Array<{
    index: number;
    error: string;
  }>;
}

// Permission Types
export type TaskAction = 'view' | 'edit' | 'delete' | 'transition' | 'assign'; 