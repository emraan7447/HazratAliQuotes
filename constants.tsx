
import { VideoTemplate, QuoteCategory } from './types';

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  {
    id: 'wisdom',
    name: 'Knowledge & Wisdom',
    description: 'The gates of intellect',
    icon: '🧠',
    query: 'Hazrat Ali quotes on knowledge and wisdom'
  },
  {
    id: 'courage',
    name: 'Courage & Valor',
    description: 'Strength of the heart',
    icon: '⚔️',
    query: 'Hazrat Ali sayings on bravery and courage'
  },
  {
    id: 'justice',
    name: 'Justice & Equity',
    description: 'The foundation of rule',
    icon: '⚖️',
    query: 'Hazrat Ali quotes on justice and leadership'
  },
  {
    id: 'worldliness',
    name: 'Zuhd (Asceticism)',
    description: 'Reality of this world',
    icon: '🌍',
    query: 'Hazrat Ali quotes on worldliness and zuhd'
  },
  {
    id: 'friendship',
    name: 'Friendship & People',
    description: 'Character and company',
    icon: '🤝',
    query: 'Hazrat Ali quotes on friends and social manners'
  },
  {
    id: 'patience',
    name: 'Patience & Piety',
    description: 'Endurance and Taqwa',
    icon: '⚓',
    query: 'Hazrat Ali quotes on patience and god-consciousness'
  },
  {
    id: 'eloquence',
    name: 'Eloquent Sayings',
    description: 'Short peak of wisdom',
    icon: '📜',
    query: 'Nahj al-Balagha short sayings'
  }
];

export const TEMPLATES: VideoTemplate[] = [
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    previewUrl: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&q=80&w=200&h=355',
    bgClass: 'bg-gradient-to-tr from-amber-900 via-yellow-700 to-amber-900',
    textStyle: 'text-amber-50 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] font-serif'
  },
  {
    id: 'ocean-calm',
    name: 'Ocean Calm',
    previewUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=200&h=355',
    bgClass: 'bg-gradient-to-b from-cyan-900 via-blue-800 to-slate-900',
    textStyle: 'text-cyan-50 drop-shadow-md'
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Deen',
    previewUrl: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&q=80&w=200&h=355',
    bgClass: 'bg-gradient-to-br from-emerald-900 to-teal-950',
    textStyle: 'text-emerald-50'
  },
  {
    id: 'minimalist-white',
    name: 'Pure White',
    previewUrl: 'https://images.unsplash.com/photo-1470790376778-a9fbc86d70e2?auto=format&fit=crop&q=80&w=200&h=355',
    bgClass: 'bg-slate-50 border-x-8 border-slate-200',
    textStyle: 'text-slate-900 font-bold'
  },
  {
    id: 'midnight-quran',
    name: 'Night Wisdom',
    previewUrl: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&q=80&w=200&h=355',
    bgClass: 'bg-slate-950',
    textStyle: 'text-indigo-200'
  }
];

export const VOICES = [
  { id: 'Kore', name: 'Kore (Strong/Deep)', lang: 'Urdu' },
  { id: 'Puck', name: 'Puck (Soft/Narrative)', lang: 'Urdu' },
  { id: 'Zephyr', name: 'Zephyr (Friendly)', lang: 'Urdu' },
  { id: 'Charon', name: 'Charon (Calm)', lang: 'Urdu' }
];
