
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { AliQuote, VideoTemplate, VideoSettings } from '../types';

interface VideoPreviewProps {
  quote: AliQuote | null;
  template: VideoTemplate;
  settings: VideoSettings;
  videoUrl?: string;
  isGenerating: boolean;
}

export interface VideoPreviewHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getVideoElement: () => HTMLVideoElement | null;
}

const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(({ 
  quote, 
  template, 
  settings, 
  videoUrl, 
  isGenerating 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getVideoElement: () => videoRef.current
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      // 1. Draw Background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);
      
      if (videoUrl && video.readyState >= 2) {
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = W / H;
        let drawW, drawH, drawX, drawY;

        if (videoAspect > canvasAspect) {
          drawH = H;
          drawW = H * videoAspect;
          drawX = (W - drawW) / 2;
          drawY = 0;
        } else {
          drawW = W;
          drawH = W / videoAspect;
          drawX = 0;
          drawY = (H - drawH) / 2;
        }
        ctx.drawImage(video, drawX, drawY, drawW, drawH);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, W, H);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Draw Content
      if (quote) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = 'white';

        const padding = 100;
        const maxWidth = W - (padding * 2);
        
        let baseArabicSize = 68;
        let baseUrduSize = 64;
        
        const totalCharCount = (quote.arabic?.length || 0) + quote.urdu.length;
        if (totalCharCount > 600) {
          baseArabicSize = 48;
          baseUrduSize = 44;
        }

        // Prepare Arabic Text
        let arabicLines: string[] = [];
        if (settings.includeArabic && quote.arabic) {
          ctx.font = `bold ${baseArabicSize}px Amiri, serif`;
          arabicLines = wrapText(ctx, quote.arabic, maxWidth);
        }

        // Prepare Urdu Text
        ctx.font = `400 ${baseUrduSize}px 'Noto Nastaliq Urdu', serif`;
        const urduLines = wrapText(ctx, quote.urdu, maxWidth);

        const arabicLineHeight = baseArabicSize * 1.6;
        const urduLineHeight = baseUrduSize * 2.4; 
        const arabicHeight = settings.includeArabic ? arabicLines.length * arabicLineHeight : 0;
        const urduHeight = urduLines.length * urduLineHeight;
        const spacing = 120;
        
        const totalContentHeight = arabicHeight + (arabicHeight > 0 ? spacing : 0) + urduHeight;
        
        const headerSpace = 300;
        const footerSpace = 400;
        const availableHeight = H - headerSpace - footerSpace;
        
        let currentY = headerSpace + (availableHeight - totalContentHeight) / 2;

        // Draw Arabic
        if (settings.includeArabic && quote.arabic) {
          ctx.font = `bold ${baseArabicSize}px Amiri, serif`;
          ctx.fillStyle = '#fef3c7'; 
          arabicLines.forEach((line) => {
            ctx.fillText(line, W / 2, currentY + (arabicLineHeight / 2));
            currentY += arabicLineHeight;
          });
          currentY += spacing;
        }

        // Draw Urdu
        ctx.font = `400 ${baseUrduSize}px 'Noto Nastaliq Urdu', serif`;
        ctx.fillStyle = 'white';
        urduLines.forEach((line) => {
          ctx.fillText(line, W / 2, currentY + (urduLineHeight / 2));
          currentY += urduLineHeight;
        });

        // Footer Reference
        const footerCenterY = H - 240;
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(W/2 - 420, footerCenterY - 80, 840, 160, 30);
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowBlur = 5;
        ctx.shadowColor = 'black';
        ctx.font = 'bold 38px Inter, sans-serif';
        ctx.fillStyle = '#fbbf24'; 
        ctx.fillText(quote.source.toUpperCase(), W / 2, footerCenterY);
      }

      // Branding Header
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fbbf24'; 
      ctx.beginPath();
      ctx.roundRect(W/2 - 180, 100, 360, 80, 20);
      ctx.fill();
      
      ctx.fillStyle = 'black';
      ctx.font = 'black 34px Inter, sans-serif';
      ctx.fillText('ALI WISDOM', W/2, 142);

      requestRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [quote, settings, videoUrl, isGenerating]);

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  return (
    <div className="relative aspect-[9/16] w-full max-w-[360px] mx-auto rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] bg-black border-[14px] border-slate-900">
      <video 
        ref={videoRef}
        src={videoUrl} 
        style={{ display: 'none' }}
        autoPlay 
        loop 
        muted 
        crossOrigin="anonymous"
        playsInline
      />
      <canvas 
        ref={canvasRef}
        width={1080}
        height={1920}
        className="w-full h-full object-contain"
      />

      {isGenerating && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center z-50">
          <div className="w-20 h-20 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-8" />
          <h3 className="text-white text-xl font-black mb-2">Generating Ali Wisdom</h3>
          <p className="text-amber-400 text-sm font-medium animate-pulse">Eloquence in Progress...</p>
        </div>
      )}
    </div>
  );
});

export default VideoPreview;
