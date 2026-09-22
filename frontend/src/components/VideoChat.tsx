import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, CitedTimestamp } from '../types';
import { chatApi } from '../api/client';
import { Send, Sparkles, Clock, Bot, User, CornerDownLeft, Loader2 } from 'lucide-react';
import { useToast } from './Toast';

interface VideoChatProps {
  videoId: number;
  videoTitle: string;
  onSeekToTimestamp?: (seconds: number) => void;
}

const quickPrompts = [
  'Explain this concept simply (ELI5)',
  'Give me a concrete real-world example',
  'What are the most important points for an exam?',
  'What are the key trade-offs mentioned?'
];

export const VideoChat: React.FC<VideoChatProps> = ({ videoId, videoTitle, onSeekToTimestamp }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await chatApi.getHistory(videoId);
        setMessages(history);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    };
    loadHistory();
  }, [videoId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || isLoading) return;

    setInputMessage('');
    const tempUserMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      cited_timestamps: [],
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await chatApi.askAi(videoId, query);
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error(err);
      toast('Failed to get answer from AI. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ask AI (RAG Grounded)</h4>
            <p className="text-xs text-slate-500 truncate max-w-xs">Grounded in "{videoTitle}"</p>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
            <Bot className="w-10 h-10 text-indigo-500/60" />
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Ask anything about this video
              </p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Answers are grounded directly in the transcript with clickable timestamp citations.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className="max-w-[82%] space-y-2">
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>

                  {/* Timestamp Citations Badges */}
                  {!isUser && m.cited_timestamps && m.cited_timestamps.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {m.cited_timestamps.map((ts, idx) => (
                        <button
                          key={idx}
                          onClick={() => onSeekToTimestamp && onSeekToTimestamp(ts.seconds)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 transition-colors shadow-sm"
                          title={`Seek to ${ts.time_str}`}
                        >
                          <Clock className="w-3 h-3 text-indigo-500" />
                          <span>Jump to {ts.time_str}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0 text-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span>Analyzing transcript & citing timestamps...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 whitespace-nowrap transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question about this video..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shrink-0 shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
