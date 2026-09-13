// Shared MediaRecorder mimeType selection for every place in the app that records
// audio (question-editor AudioField/ClipField, WordAudioRecorder, RecordCombos).
//
// Root cause this exists to fix: MediaRecorder in Chrome/most desktop browsers
// (where the editor is normally used) only supports 'audio/webm', and previously
// every recorder hardcoded `MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
// : 'audio/ogg'`. iOS Safari — very likely a large share of this app's end-user
// audience — cannot play back audio/webm (or audio/ogg) at all; <audio>/Audio().play()
// on such a file fails silently (MEDIA_ERR_SRC_NOT_SUPPORTED) with no visible error,
// which is exactly the "clicking the option produces no sound" symptom reported.
//
// Fix: try the most broadly-playable formats first (audio/mp4, audio/aac — which
// Safari supports and records with), falling back to webm/ogg on browsers that don't
// support anything else. This doesn't retroactively fix already-uploaded webm clips,
// but any new recording from here on picks the best format the recording browser
// itself offers, and names/serves it with a matching extension and content-type.
const CANDIDATES: { mimeType: string; ext: string }[] = [
  { mimeType: 'audio/mp4', ext: 'mp4' },
  { mimeType: 'audio/aac', ext: 'aac' },
  { mimeType: 'audio/webm;codecs=opus', ext: 'webm' },
  { mimeType: 'audio/webm', ext: 'webm' },
  { mimeType: 'audio/ogg', ext: 'ogg' },
];

export function pickRecordingMimeType(): { mimeType?: string; ext: string } {
  for (const c of CANDIDATES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  // Nothing on the priority list is supported — let the browser pick its own
  // default (mimeType omitted) and fall back to naming it .webm.
  return { mimeType: undefined, ext: 'webm' };
}

// Derive a file extension from an actual recorded blob's mimeType (e.g. the
// MediaRecorder instance's own `.mimeType`, which may include codec parameters).
export function extFromMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  return 'webm';
}
