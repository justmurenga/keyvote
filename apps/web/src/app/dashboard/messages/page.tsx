'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Loader2,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Users as UsersIcon,
  Archive,
  X,
  Lock,
  Volume2,
  VolumeX,
  Megaphone,
  MapPin,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getSoundEnabled, setSoundEnabled, playNotificationSound, playSentSound } from '@/lib/notifications/sound';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

const ADMIN_ROLES = ['admin', 'system_admin'];

interface UserMini {
  id: string;
  full_name: string;
  phone?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

interface Conversation {
  id: string;
  conversation_type: 'candidate_agent' | 'admin_user' | 'support';
  subject: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  candidate_unread_count: number;
  agent_unread_count: number;
  initiator_unread_count: number;
  recipient_unread_count: number;
  candidates: { id: string; users: UserMini } | null;
  agents: { id: string; users: UserMini } | null;
  initiator: UserMini | null;
  recipient: UserMini | null;
  initiator_user_id: string | null;
  recipient_user_id: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  media_url: string | null;
  is_read: boolean;
  created_at: string;
  sender: UserMini;
}

const ROLE_OPTIONS = [
  { value: '', label: 'Any role' },
  { value: 'voter', label: 'Voter' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'agent', label: 'Agent' },
  { value: 'party_admin', label: 'Party Admin' },
  { value: 'admin', label: 'Admin' },
];

function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

export default function DashboardMessagesPage() {
  const { profile } = useAuth();
  const isAdmin = !!profile?.role && ADMIN_ROLES.includes(profile.role);
  const userId = profile?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- "New Conversation" dialog state ----
  const [newOpen, setNewOpen] = useState(false);
  const [newSearch, setNewSearch] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newResults, setNewResults] = useState<UserMini[]>([]);
  const [newRecipient, setNewRecipient] = useState<UserMini | null>(null);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newSearchLoading, setNewSearchLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newError, setNewError] = useState<string | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);

  // ---- Region filter (used in the New / Broadcast dialogs) ----
  interface RegionOption { id: string; name: string }
  const [regCountyId, setRegCountyId] = useState('');
  const [regConstituencyId, setRegConstituencyId] = useState('');
  const [regWardId, setRegWardId] = useState('');
  const [counties, setCounties] = useState<RegionOption[]>([]);
  const [constituencies, setConstituencies] = useState<RegionOption[]>([]);
  const [wards, setWards] = useState<RegionOption[]>([]);

  // Load counties when dialog opens.
  useEffect(() => {
    if (!newOpen) return;
    if (counties.length > 0) return;
    fetch('/api/regions?type=counties')
      .then((r) => r.json())
      .then((d) => setCounties((d.regions || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [newOpen, counties.length]);

  // Load constituencies when county selected.
  useEffect(() => {
    if (!regCountyId) { setConstituencies([]); setRegConstituencyId(''); return; }
    fetch(`/api/regions?type=constituencies&parentId=${regCountyId}`)
      .then((r) => r.json())
      .then((d) => setConstituencies((d.regions || []).map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(() => {});
  }, [regCountyId]);

  // Load wards when constituency selected.
  useEffect(() => {
    if (!regConstituencyId) { setWards([]); setRegWardId(''); return; }
    fetch(`/api/regions?type=wards&parentId=${regConstituencyId}`)
      .then((r) => r.json())
      .then((d) => setWards((d.regions || []).map((w: any) => ({ id: w.id, name: w.name }))))
      .catch(() => {});
  }, [regConstituencyId]);

  const clearRegionFilter = () => {
    setRegCountyId('');
    setRegConstituencyId('');
    setRegWardId('');
  };
  const hasRegionFilter = !!(regCountyId || regConstituencyId || regWardId);

  // Detect candidate role for the broadcast feature.
  const isCandidate = profile?.role === 'candidate';

  // ---- Sound preference (persisted, default ON) ----
  const [soundOn, setSoundOnState] = useState<boolean>(true);
  useEffect(() => {
    setSoundOnState(getSoundEnabled());
    const onChange = (e: Event) => setSoundOnState((e as CustomEvent).detail as boolean);
    window.addEventListener('myvote:notif-sound-changed', onChange);
    return () => window.removeEventListener('myvote:notif-sound-changed', onChange);
  }, []);
  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOnState(next);
    if (next) playNotificationSound(true); // preview when turning on
  };

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?scope=${scope}`);
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  // Poll the conversation list independently so incoming messages on
  // *other* threads (or while no thread is selected) still update unread
  // counts and trigger the chime.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Track the most recent incoming message id to detect new arrivals while
  // a conversation is open (the server marks them read on each poll, so the
  // unread-count chime never fires for the active thread).
  const lastIncomingMsgIdRef = useRef<string | null>(null);
  const lastIncomingConvRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    // Reset incoming tracker when switching conversations so we don't chime
    // on the latest historical message right after opening a thread.
    if (lastIncomingConvRef.current !== selectedId) {
      lastIncomingConvRef.current = selectedId;
      lastIncomingMsgIdRef.current = null;
    }
    let active = true;
    let primed = false;
    const fetchMessages = async () => {
      const res = await fetch(`/api/messages/${selectedId}`);
      const data = await res.json();
      if (!active) return;
      const list: Message[] = data.messages || [];
      setMessages(list);
      // Find the newest message NOT sent by me.
      const incoming = [...list].reverse().find((m) => m.sender_id !== userId);
      if (incoming) {
        if (!primed) {
          // First fetch after opening the thread — just remember the latest
          // incoming id without chiming.
          lastIncomingMsgIdRef.current = incoming.id;
        } else if (lastIncomingMsgIdRef.current !== incoming.id) {
          lastIncomingMsgIdRef.current = incoming.id;
          playNotificationSound();
        }
      }
      primed = true;
      fetchConversations();
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedId, fetchConversations, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- Helpers to render conversation rows uniformly ----
  const getOtherParty = useCallback(
    (conv: Conversation): UserMini | null => {
      if (conv.conversation_type === 'candidate_agent') {
        if (userId === conv.candidates?.users?.id) return conv.agents?.users ?? null;
        if (userId === conv.agents?.users?.id) return conv.candidates?.users ?? null;
        // Admin viewing in moderation mode — show the candidate as primary, agent as sub-text.
        return conv.candidates?.users ?? conv.agents?.users ?? null;
      }
      // admin_user / support
      if (userId === conv.initiator_user_id) return conv.recipient;
      if (userId === conv.recipient_user_id) return conv.initiator;
      return conv.recipient || conv.initiator;
    },
    [userId],
  );

  const getUnreadCount = useCallback(
    (conv: Conversation): number => {
      if (conv.conversation_type === 'candidate_agent') {
        if (userId === conv.candidates?.users?.id) return conv.candidate_unread_count || 0;
        if (userId === conv.agents?.users?.id) return conv.agent_unread_count || 0;
        return 0;
      }
      if (userId === conv.initiator_user_id) return conv.initiator_unread_count || 0;
      if (userId === conv.recipient_user_id) return conv.recipient_unread_count || 0;
      return 0;
    },
    [userId],
  );

  const getConvSubtitle = (conv: Conversation): string => {
    if (conv.subject) return conv.subject;
    if (conv.conversation_type === 'admin_user') return 'Admin conversation';
    return 'Candidate ↔ Agent';
  };

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const other = getOtherParty(c);
      return (
        other?.full_name?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.last_message_preview?.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery, getOtherParty]);

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;

  // ---- Sending a message ----
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
        playSentSound();
        const data = await fetch(`/api/messages/${selectedId}`).then((r) => r.json());
        setMessages(data.messages || []);
        // Re-prime the incoming tracker so our own send doesn't trigger an
        // incoming chime on the next poll.
        const list: Message[] = data.messages || [];
        const incoming = [...list].reverse().find((m) => m.sender_id !== userId);
        if (incoming) lastIncomingMsgIdRef.current = incoming.id;
        fetchConversations();
      }
    } catch {
      /* noop */
    } finally {
      setSending(false);
    }
  };

  // ---- Archive conversation ----
  const handleArchive = async (id: string) => {
    if (!confirm('Archive this conversation? It can be re-opened by starting a new message with the same person.')) return;
    const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
    if (res.ok) {
      if (selectedId === id) setSelectedId(null);
      fetchConversations();
    }
  };

  // ---- New conversation: search users ----
  useEffect(() => {
    if (!newOpen || broadcastMode) return;
    const t = setTimeout(async () => {
      setNewSearchLoading(true);
      try {
        const params = new URLSearchParams();
        if (newSearch) params.set('q', newSearch);
        if (newRole) params.set('role', newRole);
        if (regCountyId) params.set('countyId', regCountyId);
        if (regConstituencyId) params.set('constituencyId', regConstituencyId);
        if (regWardId) params.set('wardId', regWardId);
        const res = await fetch(`/api/messages/users?${params.toString()}`);
        const data = await res.json();
        setNewResults(data.users || []);
      } catch {
        setNewResults([]);
      } finally {
        setNewSearchLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [newOpen, broadcastMode, newSearch, newRole, regCountyId, regConstituencyId, regWardId]);

  const resetNewDialog = () => {
    setNewSearch('');
    setNewRole('');
    setNewResults([]);
    setNewRecipient(null);
    setNewSubject('');
    setNewBody('');
    setNewError(null);
    setBroadcastMode(false);
    clearRegionFilter();
  };

  // ---- Deep link via ?conversation=<id> (e.g. from notifications bell) ----
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams?.get('conversation');
    if (id && conversations.some((c) => c.id === id)) {
      setSelectedId(id);
    }
  }, [searchParams, conversations]);

  // ---- Active notifications: tab title + Web Notifications API ----
  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + getUnreadCount(c), 0),
    [conversations, getUnreadCount],
  );
  const lastTotalUnreadRef = useRef(0);
  const baseTitleRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (baseTitleRef.current === null) {
      baseTitleRef.current = document.title.replace(/^\(\d+\)\s*/, '');
    }
    document.title = totalUnread > 0
      ? `(${totalUnread}) ${baseTitleRef.current}`
      : baseTitleRef.current;

    // Ask permission once.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // Fire a browser notification + chime when unread count rises.
    if (totalUnread > lastTotalUnreadRef.current) {
      // Audible chime (respects user preference, throttled internally).
      playNotificationSound();

      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        try {
          new Notification('myVote — new message', {
            body: 'You have a new in-app message.',
            icon: '/icon-192.png',
            tag: 'myvote-messages',
          });
        } catch {
          /* noop */
        }
      }
    }
    lastTotalUnreadRef.current = totalUnread;

    return () => {
      if (baseTitleRef.current !== null) document.title = baseTitleRef.current;
    };
  }, [totalUnread]);

  const handleCreateConversation = async () => {
    if (!newBody.trim()) {
      setNewError('Write an initial message.');
      return;
    }
    if (!broadcastMode && !newRecipient) {
      setNewError('Pick a recipient first.');
      return;
    }
    setCreating(true);
    setNewError(null);
    try {
      let body: Record<string, unknown>;
      if (broadcastMode) {
        body = {
          type: 'broadcast_to_agents',
          initialMessage: newBody.trim(),
          countyId: regCountyId || undefined,
          constituencyId: regConstituencyId || undefined,
          wardId: regWardId || undefined,
        };
      } else {
        const isCandAgent =
          !isAdmin && (newRecipient!.role === 'agent' || newRecipient!.role === 'candidate');
        body = isCandAgent
          ? {
              type: 'candidate_agent',
              otherUserId: newRecipient!.id,
              initialMessage: newBody.trim(),
            }
          : {
              type: 'admin_user',
              recipientUserId: newRecipient!.id,
              subject: newSubject.trim() || null,
              initialMessage: newBody.trim(),
            };
      }

      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create conversation');
      setNewOpen(false);
      resetNewDialog();
      await fetchConversations();
      if (data.conversationId) setSelectedId(data.conversationId);
      if (data.broadcast) {
        // Brief on-screen confirmation via window alert (no toast lib in scope).
        window.alert(`Broadcast delivered to ${data.delivered}/${data.total} agents.`);
      }
    } catch (err: any) {
      setNewError(err?.message || 'Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Messages
            {isAdmin && (
              <Badge variant="secondary" className="text-[10px] uppercase">
                <ShieldCheck className="h-3 w-3 mr-1" /> Admin
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Manage in-app conversations across the platform and reply to users directly.'
              : 'Communicate with your candidates and agents in real time.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div className="inline-flex rounded-md border bg-background p-1 text-xs">
              <button
                type="button"
                onClick={() => setScope('mine')}
                className={cn(
                  'px-3 py-1 rounded',
                  scope === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                My threads
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={cn(
                  'px-3 py-1 rounded',
                  scope === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <UsersIcon className="h-3.5 w-3.5 inline mr-1" /> All
              </button>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleSound}
            title={soundOn ? 'Mute notification sound' : 'Enable notification sound'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </Button>
          {isCandidate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { resetNewDialog(); setBroadcastMode(true); setNewOpen(true); }}
              title="Send a single message to every active agent"
            >
              <Megaphone className="h-4 w-4 mr-1" /> Broadcast
            </Button>
          )}
          <Button size="sm" onClick={() => { resetNewDialog(); setNewOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New message
          </Button>
        </div>
      </div>

      {/* End-to-end encryption notice */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3">
        <Lock className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-emerald-900 dark:text-emerald-100">
            End-to-end secured conversations
          </p>
          <p className="text-emerald-800/80 dark:text-emerald-200/80 text-xs mt-0.5">
            Messages in this thread are encrypted in transit and at rest. Only you and your
            recipient can read them — myVote staff cannot access the contents of your conversation.
          </p>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-3 h-[640px] border rounded-lg overflow-hidden">
        {/* Conversations List */}
        <div
          className={cn(
            'lg:col-span-1 border-r flex flex-col bg-background',
            selectedId ? 'hidden lg:flex' : 'flex',
          )}
        >
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No conversations yet
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={() => { resetNewDialog(); setNewOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Start one
                  </Button>
                </div>
              </div>
            ) : (
              filtered.map((conv) => {
                const other = getOtherParty(conv);
                const unread = getUnreadCount(conv);
                const isAdminThread = conv.conversation_type === 'admin_user';
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedId(conv.id)}
                    className={cn(
                      'w-full p-3 text-left transition-colors border-b group',
                      selectedId === conv.id ? 'bg-primary/10' : 'hover:bg-muted',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs">{initials(other?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{other?.full_name || 'Unknown'}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isAdminThread && (
                              <Badge variant="outline" className="h-4 text-[9px] px-1 uppercase">Admin</Badge>
                            )}
                            {unread > 0 && (
                              <Badge className="h-5 min-w-5 p-0 flex items-center justify-center text-xs">{unread}</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80 truncate">{getConvSubtitle(conv)}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message_preview || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message Area */}
        <div
          className={cn(
            'lg:col-span-2 flex flex-col bg-background',
            !selectedId ? 'hidden lg:flex' : 'flex',
          )}
        >
          {selectedId && selectedConv ? (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden p-1"
                  aria-label="Back to list"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {initials(getOtherParty(selectedConv)?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {getOtherParty(selectedConv)?.full_name || 'Unknown'}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {getConvSubtitle(selectedConv)}
                    {selectedConv.conversation_type === 'admin_user' && getOtherParty(selectedConv)?.role
                      ? ` · ${getOtherParty(selectedConv)?.role}`
                      : ''}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleArchive(selectedConv.id)}
                  title="Archive conversation"
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-muted/30">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-20 text-sm">
                    No messages yet. Send the first message!
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === userId;
                    return (
                      <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className="max-w-[75%]">
                          {!isMine && (
                            <p className="text-[10px] text-muted-foreground mb-0.5 ml-2">
                              {msg.sender?.full_name}
                              {msg.sender?.role ? ` · ${msg.sender.role}` : ''}
                            </p>
                          )}
                          <div
                            className={cn(
                              'rounded-2xl px-4 py-2 text-sm',
                              isMine ? 'bg-primary text-primary-foreground' : 'bg-background border',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p
                              className={cn(
                                'text-[10px] mt-1',
                                isMine ? 'text-primary-foreground/60' : 'text-muted-foreground',
                              )}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t flex gap-2 items-end">
                <Textarea
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 min-h-[40px] max-h-32 resize-none"
                  disabled={sending}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as any);
                    }
                  }}
                />
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
                <Button size="sm" className="mt-4" onClick={() => { resetNewDialog(); setNewOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> New message
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ----- New Conversation Dialog ----- */}
      <Dialog open={newOpen} onOpenChange={(o) => { setNewOpen(o); if (!o) resetNewDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{broadcastMode ? 'Broadcast to all my agents' : 'New conversation'}</DialogTitle>
            <DialogDescription>
              {broadcastMode
                ? 'Your message will be delivered to every active agent in your campaign as a separate in-app conversation.'
                : isAdmin
                  ? 'Search any user on the platform and send them a direct in-app message.'
                  : 'Pick a recipient and write your first message.'}
            </DialogDescription>
          </DialogHeader>

          {/* Region filter — narrows the recipient/agent search by county/constituency/ward */}
          <div className="rounded-md border bg-muted/40 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                Filter by region {broadcastMode ? '(narrow which agents receive this)' : ''}
              </p>
              {hasRegionFilter && (
                <button
                  type="button"
                  onClick={clearRegionFilter}
                  className="text-[11px] text-primary hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={regCountyId}
                onChange={(e) => { setRegCountyId(e.target.value); setRegConstituencyId(''); setRegWardId(''); }}
                className="border rounded-md px-2 py-1.5 text-xs bg-background"
              >
                <option value="">All counties</option>
                {counties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={regConstituencyId}
                onChange={(e) => { setRegConstituencyId(e.target.value); setRegWardId(''); }}
                disabled={!regCountyId}
                className="border rounded-md px-2 py-1.5 text-xs bg-background disabled:opacity-50"
              >
                <option value="">All constituencies</option>
                {constituencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                value={regWardId}
                onChange={(e) => setRegWardId(e.target.value)}
                disabled={!regConstituencyId}
                className="border rounded-md px-2 py-1.5 text-xs bg-background disabled:opacity-50"
              >
                <option value="">All wards</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {broadcastMode ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3 flex items-start gap-3">
              <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-900 dark:text-emerald-100">
                You are about to send the same message to <strong>all of your active agents</strong>.
                Each agent will receive it as a private 1:1 conversation, so they can reply just to you.
              </p>
            </div>
          ) : newRecipient ? (
            <div className="rounded-lg border p-3 flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs">{initials(newRecipient.full_name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{newRecipient.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {newRecipient.role || 'user'}
                  {newRecipient.phone ? ` · ${newRecipient.phone}` : ''}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewRecipient(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder={isAdmin ? 'Search by name or phone...' : 'Search recipients...'}
                    value={newSearch}
                    onChange={(e) => setNewSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isAdmin && (
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="border rounded-md px-2 text-sm bg-background"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {newSearchLoading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : newResults.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No users found</p>
                ) : (
                  newResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setNewRecipient(u)}
                      className="w-full text-left p-2.5 hover:bg-muted flex items-center gap-3 border-b last:border-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {u.role || 'user'}{u.phone ? ` · ${u.phone}` : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {(broadcastMode || newRecipient) && (
            <div className="space-y-2">
              {isAdmin && !broadcastMode && (
                <Input
                  placeholder="Subject (optional)"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              )}
              <Textarea
                placeholder={broadcastMode ? 'Write the announcement to send to all agents...' : 'Write your message...'}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={broadcastMode ? 6 : 4}
              />
            </div>
          )}

          {newError && <p className="text-sm text-destructive">{newError}</p>}

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setNewOpen(false); resetNewDialog(); }}>
              Cancel
            </Button>
            <Button
              disabled={(!broadcastMode && !newRecipient) || !newBody.trim() || creating}
              onClick={handleCreateConversation}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : broadcastMode ? (
                <Megaphone className="h-4 w-4 mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              {broadcastMode ? 'Broadcast' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
