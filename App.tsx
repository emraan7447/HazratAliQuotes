
import React, { useState, useEffect, useRef } from 'react';
import { AliQuote, VideoSettings, GenerationState } from './types.ts';
import { TEMPLATES, VOICES, QUOTE_CATEGORIES } from './constants.tsx';
import { WisdomService } from './services/geminiService.ts';
import VideoPreview, { VideoPreviewHandle } from './components/VideoPreview.tsx';

async function decodeRawPcm(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [quote, setQuote] = useState<AliQuote | null>(null);
  const [backgroundVideo, setBackgroundVideo] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  const [settings, setSettings] = useState<VideoSettings>({
    templateId: TEMPLATES[0].id,
    fontSize: 24,
    voice: 'Charon',
    includeArabic: true,
    category: 'wisdom'
  });
  
  const [genState, setGenState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    message: ''
  });

  const previewRef = useRef<VideoPreviewHandle>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    fetchQuote('wisdom');

    // PWA Installation logic
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
      console.log('AliWisdom was installed');
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const fetchQuote = async (categoryOverride?: string) => {
    const catId = categoryOverride || settings.category;
    const activeCategory = QUOTE_CATEGORIES.find(c => c.id === catId) || QUOTE_CATEGORIES[0];
    
    setGenState({ status: 'fetching_quote', progress: 10, message: `Consulting the Peak of Eloquence...` });
    setFinalVideoUrl(null);
    try {
      const data = await WisdomService.getAliQuote(activeCategory.query);
      setQuote(data);
      
      const bgQuery = `ancient library desert sword justice ${catId}`;
      const video = await WisdomService.getPexelsVideo(bgQuery);
      setBackgroundVideo(video);
      
      setGenState({ status: 'idle', progress: 0, message: '' });
    } catch (error: any) {
      console.error("Fetch error:", error);
      setGenState({ status: 'error', progress: 0, message: 'Retrying wisdom fetch...' });
      setTimeout(() => fetchQuote(catId), 2000);
    }
  };

  const handleCategoryChange = (catId: string) => {
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    setSettings(prev => ({ ...prev, category: catId }));
    fetchQuote(catId);
  };

  const generateFullVideo = async () => {
    if (!quote || !previewRef.current) return;
    
    setGenState({ status: 'generating_tts', progress: 10, message: 'Narrating Wisdom...' });
    setFinalVideoUrl(null);
    
    try {
      const base64Audio = await WisdomService.generateVoiceover(quote.narrationScript, settings.voice);
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000
        });
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const audioBuffer = await decodeRawPcm(bytes, audioContextRef.current, 24000, 1);

      setGenState({ status: 'generating_video', progress: 40, message: 'Rendering Short...' });
      const canvas = previewRef.current.getCanvas();
      const bgVideo = previewRef.current.getVideoElement();
      if (!canvas) throw new Error("Studio Monitor not ready");

      const canvasStream = canvas.captureStream(30);
      const audioDest = audioContextRef.current.createMediaStreamDestination();
      const audioSource = audioContextRef.current.createBufferSource();
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioDest);

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDest.stream.getAudioTracks()
      ]);

      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error("Recording not supported");

      const recorder = new MediaRecorder(combinedStream, { 
        mimeType,
        videoBitsPerSecond: 8000000 
      });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: mimeType });
        setFinalVideoUrl(URL.createObjectURL(finalBlob));
        setGenState({ status: 'complete', progress: 100, message: 'Ali Wisdom Produced!' });
      };

      recorder.start();
      audioSource.start();

      if (bgVideo && bgVideo.paused) {
        bgVideo.play().catch(console.error);
      }

      const durationMs = audioBuffer.duration * 1000;
      let elapsed = 0;
      const progressInterval = setInterval(() => {
        elapsed += 100;
        const p = Math.min(40 + (elapsed / durationMs) * 60, 99);
        setGenState(prev => ({ ...prev, progress: Math.floor(p) }));
        
        if (elapsed >= durationMs) {
          clearInterval(progressInterval);
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        }
      }, 100);

    } catch (error: any) {
      console.error("Recording error:", error);
      setGenState({ status: 'error', progress: 0, message: `Error: ${error.message}` });
    }
  };

  const activeCategory = QUOTE_CATEGORIES.find(c => c.id === settings.category) || QUOTE_CATEGORIES[0];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans selection:bg-amber-100 pb-safe">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50 pt-safe">
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 p-2 rounded-lg text-black font-bold shadow-md shadow-amber-100">AW</div>
          <h1 className="text-xl font-bold tracking-tight">AliWisdom <span className="text-amber-600">AI</span></h1>
        </div>
        {showInstallBtn && (
          <button 
            onClick={handleInstallClick}
            className="bg-stone-900 text-white text-[10px] px-3 py-2 rounded-full font-black uppercase tracking-widest animate-bounce"
          >
            Install App
          </button>
        )}
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest px-2 mb-2 lg:mb-4">Select Theme</h2>
          <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-4 lg:pb-0 scrollbar-hide">
            {QUOTE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex flex-col lg:flex-row items-center gap-2 lg:gap-4 p-4 rounded-2xl border-2 transition-all shrink-0 min-w-[120px] lg:min-w-0 ${settings.category === cat.id ? 'border-amber-600 bg-amber-50 shadow-md' : 'border-transparent bg-white hover:bg-stone-100 opacity-80 hover:opacity-100'}`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div className="text-center lg:text-left">
                  <div className={`text-xs lg:text-sm font-bold ${settings.category === cat.id ? 'text-amber-900' : 'text-stone-700'}`}>{cat.name}</div>
                  <div className="hidden lg:block text-[10px] text-stone-400 font-medium">{cat.description}</div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 lg:p-6 rounded-3xl shadow-sm border border-stone-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="font-black text-lg lg:text-xl text-stone-900 leading-tight">Prophetic Successor Wisdom</h2>
                <p className="text-[10px] text-stone-500 font-medium uppercase tracking-tighter">Theme: <span className="text-amber-600 font-bold">{activeCategory.name}</span></p>
              </div>
              <button 
                onClick={() => fetchQuote()} 
                disabled={genState.status === 'fetching_quote'}
                className="w-full sm:w-auto bg-amber-600 text-black px-6 py-3 rounded-2xl font-black hover:bg-amber-700 transition-all disabled:opacity-50 shadow-lg shadow-amber-100 flex items-center justify-center gap-2 group active:scale-95"
              >
                <svg className={`w-5 h-5 transition-transform group-hover:rotate-180 duration-500 ${genState.status === 'fetching_quote' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                New Saying
              </button>
            </div>
            
            {quote ? (
              <div className="bg-stone-50 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] border border-stone-100 animate-in fade-in slide-in-from-bottom-2 duration-500 relative overflow-hidden">
                <p className="font-arabic text-right text-3xl lg:text-4xl mb-6 lg:mb-8 leading-[1.8] text-stone-900">{quote.arabic}</p>
                <div className="h-px bg-stone-200 mb-6 lg:mb-8 w-full" />
                <p dir="rtl" className="font-urdu text-right text-stone-700 text-xl lg:text-2xl leading-loose font-medium">"{quote.urdu}"</p>
                <div className="mt-8 lg:mt-10 flex flex-wrap gap-4">
                  <div className="flex flex-col gap-1 bg-white border border-stone-200 px-4 lg:px-5 py-2 lg:py-3 rounded-2xl shadow-sm">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Collection</span>
                    <span className="text-xs font-bold text-stone-800">{quote.source}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 rounded-[2.5rem] bg-stone-50/50">
                <p className="text-sm font-black uppercase tracking-widest animate-pulse">Fetching Ancient Wisdom...</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-sm border border-stone-200">
            <h2 className="font-black text-xl text-stone-900 mb-6 lg:mb-8">Video Production</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4 block">Visual Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setSettings(s => ({...s, templateId: t.id}))}
                      className={`relative aspect-[9/16] rounded-2xl overflow-hidden border-[3px] transition-all hover:scale-105 active:scale-95 ${settings.templateId === t.id ? 'border-amber-600 ring-4 ring-amber-500/10' : 'border-transparent opacity-60'}`}
                    >
                      <img src={t.previewUrl} className="w-full h-full object-cover" alt={t.name} />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-md text-[8px] text-white py-2 text-center font-black uppercase">{t.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6 lg:space-y-8 flex flex-col justify-center">
                <div>
                  <label className="block text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-4">Orator Voice</label>
                  <select 
                    className="w-full bg-stone-50 p-4 lg:p-5 rounded-2xl border-2 border-stone-100 outline-none focus:border-amber-500 font-bold text-sm lg:text-base"
                    value={settings.voice}
                    onChange={(e) => setSettings(s => ({...s, voice: e.target.value as any}))}
                  >
                    {VOICES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>

                <div 
                  className="flex justify-between items-center p-4 lg:p-5 bg-stone-50 rounded-2xl border-2 border-stone-100 transition-all cursor-pointer active:scale-95" 
                  onClick={() => setSettings(s => ({...s, includeArabic: !s.includeArabic}))}
                >
                  <div className="flex flex-col">
                    <span className="font-black text-xs lg:text-sm text-stone-900 uppercase">Original Arabic</span>
                    <span className="text-[9px] lg:text-[10px] text-stone-400 font-black uppercase">Show Script Overlay</span>
                  </div>
                  <div className={`w-12 lg:w-14 h-7 lg:h-8 rounded-full transition-all relative ${settings.includeArabic ? 'bg-amber-600' : 'bg-stone-300'}`}>
                    <div className={`absolute top-1 w-5 lg:w-6 h-5 lg:h-6 bg-white rounded-full shadow-md transition-all ${settings.includeArabic ? 'left-6 lg:left-7' : 'left-1'}`} />
                  </div>
                </div>

                <button 
                  onClick={generateFullVideo}
                  disabled={!quote || genState.status !== 'idle'}
                  className="w-full bg-stone-900 text-white py-5 lg:py-6 rounded-2xl lg:rounded-[2rem] font-black text-lg lg:text-xl shadow-2xl hover:bg-black transition-all transform active:scale-[0.98] flex items-center justify-center gap-4"
                >
                  Produce Short
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-center text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] mb-4">Studio Monitor</h2>
          <VideoPreview 
            ref={previewRef}
            quote={quote}
            template={TEMPLATES.find(t => t.id === settings.templateId)!}
            settings={settings}
            videoUrl={backgroundVideo || undefined}
            isGenerating={genState.status !== 'idle' && genState.status !== 'complete' && genState.status !== 'error'}
          />

          {genState.status === 'complete' && finalVideoUrl && (
            <div className="bg-white p-6 rounded-[2rem] border-4 border-amber-500 shadow-2xl animate-in slide-in-from-top-4 duration-500">
              <video src={finalVideoUrl} controls className="w-full aspect-[9/16] rounded-2xl mb-6 bg-black" playsInline autoPlay />
              <a 
                href={finalVideoUrl} 
                download={`AliWisdom_${settings.category}_${Date.now()}.webm`}
                className="w-full bg-amber-600 text-black py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-xl shadow-amber-100"
              >
                Download HD
              </a>
            </div>
          )}
        </div>
      </main>

      <footer className="py-12 text-center opacity-40">
        <div className="text-stone-400 text-[10px] font-black uppercase tracking-[0.4em]">AliWisdom AI Engine • 2025</div>
      </footer>
    </div>
  );
};

export default App;
