'use client';

import { useState } from 'react';
import { MessageSquare, Send, Search, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: string;
  agentName: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    agentName: 'James Mwangi',
    lastMessage: 'Results submitted for Westlands polling station',
    unreadCount: 2,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    agentName: 'Grace Wanjiku',
    lastMessage: 'Good morning! Ready for today\'s assignment',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export default function DashboardMessagesPage() {
  const [conversations] = useState<Conversation[]>(DEMO_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Communicate with your agents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 h-[600px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedConversation === conv.id
                    ? 'bg-primary/10'
                    : 'hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {conv.agentName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{conv.agentName}</p>
                      {conv.unreadCount > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conv.lastMessage}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Message Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {conversations.find(c => c.id === selectedConversation)?.agentName}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-y-auto">
                <div className="text-center text-muted-foreground py-20">
                  Messages will appear here
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">
                  Select a conversation to start messaging
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
