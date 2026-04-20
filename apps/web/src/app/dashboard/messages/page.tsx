'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, Search, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';

interface Conversation {
  id: string;
  last_message_at: string;
  last_message_preview: string;
  candidate_unread_count: number;
  agent_unread_count: number;
  candidates: { id: string; users: { id: string; full_name: string; avatar_url: string | null } };
  agents: { id: string; users: { id: string; full_name: string; avatar_url: string | null } };
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  sender: { id: string; full_name: string; avatar_url: string | null };
}

export default function DashboardMessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages/${selectedId}`);
      const data = await res.json();
      setMessages(data.messages || []);
      fetchConversations();
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [selectedId, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedId, content: messageText.trim() }),
      });
      if (res.ok) {
        setMessageText('');
        const data = await fetch(`/api/messages/${selectedId}`).then(r => r.json());
        setMessages(data.messages || []);
        fetchConversations();
      }
    } catch {} finally { setSending(false); }
  };

  const getOtherParty = (conv: Conversation) => {
    if (user?.id === conv.candidates?.users?.id) return conv.agents?.users;
    return conv.candidates?.users;
  };

  const getUnreadCount = (conv: Conversation) => {
    if (user?.id === conv.candidates?.users?.id) return conv.candidate_unread_count;
    return conv.agent_unread_count;
  };

  const filtered = conversations.filter(c => {
    if (!searchQuery) return true;
    const other = getOtherParty(c);
    return other?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const selectedConv = conversations.find(c => c.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Communicate with your candidates and agents</p>
      </div>

      <div className="grid gap-0 lg:grid-cols-3 h-[600px] border rounded-lg overflow-hidden">
        {/* Conversations List */}
        <div className={`lg:col-span-1 border-r flex flex-col bg-background ${selectedId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations yet
              </div>
            ) : (
              filtered.map((conv) => {
                const other = getOtherParty(conv);
                const unread = getUnreadCount(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full p-3 text-left transition-colors border-b ${selectedId === conv.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs">
                          {other?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{other?.full_name || 'Unknown'}</p>
                          {unread > 0 && (
                            <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">{unread}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{conv.last_message_preview || 'No messages yet'}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className={`lg:col-span-2 flex flex-col bg-background ${!selectedId ? 'hidden lg:flex' : 'flex'}`}>
          {selectedId && selectedConv ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                <button onClick={() => setSelectedId(null)} className="lg:hidden p-1"><ArrowLeft className="h-5 w-5" /></button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getOtherParty(selectedConv)?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <p className="font-medium text-sm">{getOtherParty(selectedConv)?.full_name}</p>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-20 text-sm">No messages yet. Send the first message!</div>
                ) : messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <Input placeholder="Type a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1" disabled={sending} />
                <Button type="submit" size="sm" disabled={sending || !messageText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
