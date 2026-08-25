/** Shared TypeScript types between Vercel web and any other consumer. */

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ProcessingStep =
  | 'extract_audio'
  | 'preprocess'
  | 'model_inference'
  | 'postprocess'
  | 'encode_output';

export interface TrackInfo {
  label: string;
  program: number;
  isDrum: boolean;
  noteCount: number;
  pitchRange: [number, number];
}

export interface TranscriptionJob {
  id: string;
  userId?: string;
  input: {
    blobUrl: string;
    filename: string;
    fileType: 'audio' | 'video';
    fileSize: number;
    duration?: number;
  };
  options: {
    instruments?: string[];
    useSampling: boolean;
    temperature: number;
  };
  status: JobStatus;
  progress: number;
  currentStep?: ProcessingStep;
  queuePosition?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: {
    midiUrl: string;
    midiSize: number;
    tracks: TrackInfo[];
    totalNotes: number;
    duration: number;
  };
  error?: { code: string; message: string; retryable: boolean };
  metadata?: Record<string, unknown>;
}