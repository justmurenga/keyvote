'use client';

import { useState } from 'react';
import {
  Phone,
  MapPin,
  MoreVertical,
  UserCheck,
  UserX,
  Ban,
  Trash2,
  Copy,
  Check,
  Clock,
  FileText,
  DollarSign,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AgentData } from '@/hooks/use-agents';

const STATUS_STYLES: Record<string, { variant: string; label: string }> = {
  active: { variant: 'success', label: 'Active' },
  pending: { variant: 'warning', label: 'Pending' },
  suspended: { variant: 'secondary', label: 'Suspended' },
  revoked: { variant: 'destructive', label: 'Revoked' },
};

const REGION_TYPE_LABELS: Record<string, string> = {
  national: 'National',
  county: 'County',
  constituency: 'Constituency',
  ward: 'Ward',
  polling_station: 'Polling Station',
};

interface AgentCardProps {
  agent: AgentData;
  onRevoke: (agentId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  onUpdate: (agentId: string, data: Record<string, any>) => Promise<{ success: boolean; error?: string }>;
  onDelete: (agentId: string) => Promise<{ success: boolean; error?: string }>;
}

export function AgentCard({ agent, onRevoke, onUpdate, onDelete }: AgentCardProps) {
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusStyle = STATUS_STYLES[agent.status] || STATUS_STYLES.pending;
  const initials = agent.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const handleRevoke = async () => {
    setIsProcessing(true);
    await onRevoke(agent.agent_id, revokeReason || undefined);
    setIsProcessing(false);
    setShowRevokeDialog(false);
    setRevokeReason('');
  };

  const handleActivate = async () => {
    setIsProcessing(true);
    await onUpdate(agent.agent_id, { status: 'active' });
    setIsProcessing(false);
  };

  const handleSuspend = async () => {
    setIsProcessing(true);
    await onUpdate(agent.agent_id, { status: 'suspended' });
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    await onDelete(agent.agent_id);
    setIsProcessing(false);
    setShowDeleteDialog(false);
  };

  const handleCopyInviteLink = async () => {
    if (agent.invitation_token) {
      const url = `${window.location.origin}/agents/accept/${agent.invitation_token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <>
      <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
        <Avatar className="h-12 w-12">
          {agent.profile_photo_url && (
            <AvatarImage src={agent.profile_photo_url} alt={agent.full_name} />
          )}
          <AvatarFallback className="text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium truncate">{agent.full_name}</p>
            <Badge variant={statusStyle.variant as any}>
              {statusStyle.label}
            </Badge>
            {agent.status === 'pending' && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Invited {timeAgo(agent.invited_at)}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {agent.phone_number || agent.invited_phone || 'No phone'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {agent.region_name}
              <span className="text-xs opacity-60">
                ({REGION_TYPE_LABELS[agent.assigned_region_type] || agent.assigned_region_type})
              </span>
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden md:flex items-center gap-6 text-center">
          <div>
            <p className="font-medium">{agent.total_reports || 0}</p>
            <p className="text-xs text-muted-foreground">Reports</p>
          </div>
          <div>
            <p className="font-medium">{agent.total_results_submitted || 0}</p>
            <p className="text-xs text-muted-foreground">Results</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {agent.status === 'pending' && agent.invitation_token && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyInviteLink}
              title="Copy invitation link"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {agent.status === 'pending' && (
                <DropdownMenuItem onClick={handleActivate}>
                  <UserCheck className="h-4 w-4 mr-2 text-green-600" />
                  Approve
                </DropdownMenuItem>
              )}
              {agent.status === 'suspended' && (
                <DropdownMenuItem onClick={handleActivate}>
                  <RefreshCw className="h-4 w-4 mr-2 text-green-600" />
                  Reactivate
                </DropdownMenuItem>
              )}
              {agent.status === 'active' && (
                <DropdownMenuItem onClick={handleSuspend}>
                  <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                  Suspend
                </DropdownMenuItem>
              )}
              {agent.status !== 'revoked' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowRevokeDialog(true)}
                    className="text-red-600"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Revoke
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Revoke Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke <strong>{agent.full_name}</strong> as your agent?
              They will no longer be able to submit reports or results on your behalf.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Input
              id="revoke-reason"
              placeholder="Enter reason for revocation..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Revoking...' : 'Revoke Agent'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the agent record for <strong>{agent.full_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isProcessing}
            >
              {isProcessing ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
