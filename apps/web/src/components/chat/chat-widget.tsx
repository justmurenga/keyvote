'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'system';
  timestamp: Date;
}

const WHATSAPP_NUMBER = '254733638940';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: 'Welcome to myVote Kenya! 👋 How can we help you today? You can ask us anything about the platform, candidates, or elections.',
      sender: 'system',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // Auto-reply after a short delay
    setTimeout(() => {
      const autoReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Thank you for your message! Our team has been notified and will get back to you shortly. For faster support, you can reach us directly on WhatsApp.',
        sender: 'system',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, autoReply]);

      // Send notification to WhatsApp
      const whatsappMessage = encodeURIComponent(
        `New myVote Chat Message:\n\n"${userMessage.text}"\n\nSent at: ${new Date().toLocaleString()}`
      );
      // Open WhatsApp in background (notification)
      const link = document.createElement('a');
      link.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // We don't auto-open, but provide the link in the chat
      setTimeout(() => {
        const whatsappSuggestion: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: '💬 Click here to continue this conversation on WhatsApp for instant support →',
          sender: 'system',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, whatsappSuggestion]);
      }, 1000);
    }, 800);
  };

  const openWhatsApp = () => {
    const lastUserMessage = messages.filter((m) => m.sender === 'user').pop();
    const text = lastUserMessage
      ? encodeURIComponent(`Hi myVote Kenya! I need help with: ${lastUserMessage.text}`)
      : encodeURIComponent('Hi myVote Kenya! I need help.');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        aria-label="Open chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] rounded-lg border bg-background shadow-2xl flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-lg bg-primary p-4 text-primary-foreground">
            <div>
              <h3 className="font-semibold">myVote Support</h3>
              <p className="text-xs text-primary-foreground/70">We typically reply within minutes</p>
            </div>
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-600 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.592-.838-6.313-2.236l-.44-.362-2.893.97.97-2.893-.362-.44A9.954 9.954 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
              </svg>
              WhatsApp
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                  onClick={msg.text.includes('WhatsApp') && msg.sender === 'system' ? openWhatsApp : undefined}
                  style={msg.text.includes('WhatsApp') && msg.sender === 'system' ? { cursor: 'pointer' } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button type="submit" size="sm" disabled={!input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
