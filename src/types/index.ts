export type QuestionType =
  | 'audio_picture'      // Q1: sound + 4 image options
  | 'syllable_count'     // Q2: count syllables (number input)
  | 'flower_count'       // Q3: count syllables (tap flowers)
  | 'record'             // Q4: repeat pronunciation
  | 'fill_blanks'        // Q5: fill missing letters
  | 'handwriting'        // Q6: write with finger
  | 'audio_options'      // Q7: pick correct audio for shown syllable
  | 'sentence_complete'  // Q8: complete sentence (word at end)
  | 'arrange'            // Q9: arrange words in order
  | 'similar_letters'    // Q10: pick correct similar letter (spelling)
  | 'phoneme'            // Q11: phoneme segmentation (صداکشی)
  | 'middle_blank'       // Q12: fill blank in middle of phrase
  | 'sound_to_text'      // Q13: hear sound, pick written form
  | 'color_letter'       // Q14: color hollow letter with finger
  | 'pair_match';        // Q15: tap 2 cards that share the same starting sound

export interface Option {
  id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  pairKey?: string; // Q15: options sharing the same pairKey form a correct pair
}

export interface Question {
  id: string;
  type: QuestionType;
  questionAudioUrl?: string;    // TTS for the question text
  questionText: string;
  mediaImageUrl?: string;       // Main image (if any)
  mediaAudioUrl?: string;       // Main audio (if any)
  mediaLabel?: string;          // Label under image
  options: Option[];
  correctAnswer: string | string[]; // option id(s) or text
  // Q2: expected syllable count
  syllableCount?: number;
  // Q5/Q11: template e.g. ['ر', null, 'ب', null, 'ه']
  template?: (string | null)[];
  // Q9: words to arrange
  words?: string[];
}

export interface Node {
  id: string;
  unitId: string;
  order: number;         // position within unit (1-3)
  type: 'lesson' | 'chest' | 'review' | 'intro';
  questions: Question[];
}

export interface Unit {
  id: string;
  letter: string;        // Persian letter e.g. 'ب'
  order: number;
  color: string;         // hex color for this unit
  nodes: Node[];
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  birthDate?: string;
  avatarUrl?: string;
  joinedAt: string;
  diamonds: number;
  streakDays: number;
  lastActiveDate?: string;
  totalScore: number;
}

export interface Friend {
  userId: string;
  friendId: string;
  addedAt: string;
}

export interface NodeProgress {
  nodeId: string;
  userId: string;
  completed: boolean;
  stars: number;           // 0–3
  accuracy: number;        // 0–100
  completedAt?: string;
  attempts: number;
}

export interface LessonSession {
  nodeId: string;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, boolean>;  // questionId -> correct?
  startedAt: string;
}
