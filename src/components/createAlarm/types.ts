export type WakeUpOption = {
  id: string;
  type: 'Voice' | 'Video' | 'Song' | 'Puzzle';
  puzzleUri?: {
    imageUri: string | null;
    soundUri: string | number | null;
  } | null;
  songUri?: string | number | null;
  songName?: string | null;
  voiceUri?: string | number | null;
  voiceName?: string | null;
  videoUri?: string | null;
  videoLink?: string | null;
};
