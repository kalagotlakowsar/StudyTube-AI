import React, { useRef, useEffect } from 'react';
import { Youtube, ExternalLink, Play, Clock } from 'lucide-react';

interface YouTubePlayerProps {
  videoId: string;
  seekSeconds?: number;
  title?: string;
  channel?: string;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  seekSeconds = 0,
  title,
  channel
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Construct iframe source with seek timestamp
  const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&start=${Math.floor(seekSeconds)}&autoplay=${seekSeconds > 0 ? 1 : 0}&rel=0`;

  return (
    <div className="w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
      {/* 16:9 Aspect Ratio Container */}
      <div className="relative w-full pb-[56.25%] bg-black">
        <iframe
          ref={iframeRef}
          key={`${videoId}-${seekSeconds}`}
          src={embedUrl}
          title={title || "YouTube video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>

      {/* Video Caption & Info Bar */}
      {(title || channel) && (
        <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
            {channel && <p className="text-xs text-slate-400 truncate">{channel}</p>}
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors shrink-0"
          >
            <span>Open YouTube</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
