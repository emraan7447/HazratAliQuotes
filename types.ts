
export interface AliQuote {
  arabic: string;
  urdu: string; 
  narrationScript: string; 
  source: string;
  category: string;
}

export interface QuoteCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  query: string;
}

export interface VideoTemplate {
  id: string;
  name: string;
  previewUrl: string;
  bgClass: string;
  textStyle: string;
}

export interface GenerationState {
  status: 'idle' | 'fetching_quote' | 'generating_tts' | 'generating_video' | 'complete' | 'error';
  progress: number;
  message: string;
  videoUrl?: string;
  audioUrl?: string;
}

export interface VideoSettings {
  templateId: string;
  fontSize: number;
  voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  includeArabic: boolean;
  category: string;
}
