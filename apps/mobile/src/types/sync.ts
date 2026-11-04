export interface HlcTimestamp {
  physicalTimeMs: number;
  logicalCounter: number;
}

export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export type SyncEntityType =
  | 'user_profiles'
  | 'workout_sessions'
  | 'workout_sets'
  | 'meals'
  | 'meal_items'
  | 'hydration_logs'
  | 'habits'
  | 'habit_completions'
  | 'sleep_logs'
  | 'body_measurements';

export interface SyncMutationPacket {
  clientQueueId: number;
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  hlc: HlcTimestamp;
}

export interface SyncPushBatchRequest {
  batchId: string;
  clientHlc: HlcTimestamp;
  mutations: SyncMutationPacket[];
}

export interface SyncItemResult {
  clientQueueId: number;
  status: 'COMMITTED' | 'REJECTED_VALIDATION' | 'CONFLICT_LWW_IGNORED';
  error?: string;
}

export interface SyncPushBatchResponse {
  batchId: string;
  serverHlc: HlcTimestamp;
  results: SyncItemResult[];
}

export interface SyncPullResponse {
  serverHlc: HlcTimestamp;
  records: Array<{
    entityType: SyncEntityType;
    entityId: string;
    operation: SyncOperation;
    payload: Record<string, unknown>;
    serverTimestamp: number;
  }>;
}
