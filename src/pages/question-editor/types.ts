import type { Option } from '../../types';

// Superset of everything any question type's form needs; each per-type form
// only reads/writes the slice it cares about. Maps directly onto the DB row
// shape (see curriculum.ts toQuestion / questions table columns).
export interface QuestionDraft {
  questionText: string;
  questionAudioUrl: string;
  mediaLabel: string;
  options: Option[];
  correctAnswer: string | string[];
  template: (string | null)[];
  syllableCount: number | '';
}

export interface FormProps {
  draft: QuestionDraft;
  patch: (p: Partial<QuestionDraft>) => void;
}

export const emptyDraft = (): QuestionDraft => ({
  questionText: '',
  questionAudioUrl: '',
  mediaLabel: '',
  options: [],
  correctAnswer: '',
  template: [],
  syllableCount: '',
});
