'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Bot,
  Target,
  MessageSquare,
  PhoneCall,
  Clock,
  BarChart3,
  Zap,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Settings2,
  Brain,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserProps {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AgentConfig {
  id: number;
  name: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
}

const AGENT_ICONS: Record<number, React.ReactNode> = {
  1: <Target className="w-6 h-6 text-emerald-600" />,
  2: <MessageSquare className="w-6 h-6 text-blue-600" />,
  3: <PhoneCall className="w-6 h-6 text-amber-600" />,
  4: <Clock className="w-6 h-6 text-purple-600" />,
  5: <BarChart3 className="w-6 h-6 text-rose-600" />,
};

const AGENT_COLORS: Record<number, { bg: string; border: string; iconBg: string }> = {
  1: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
  2: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100' },
  3: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100' },
  4: { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100' },
  5: { bg: 'bg-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-100' },
};

export default function AIAgentsPage({ user }: { user: UserProps }) {
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentConfig | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/ai-agents');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load AI agent data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleToggle = async (agent: AgentConfig) => {
    setTogglingId(agent.id);
    try {
      const res = await fetch('/api/ai-agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, enabled: !agent.enabled }),
      });
      if (res.ok) {
        setAgents((prev) =>
          prev.map((a) => (a.id === agent.id ? { ...a, enabled: !a.enabled } : a)),
        );
        toast({
          title: agent.enabled ? 'Agent Disabled' : 'Agent Enabled',
          description: `${agent.name} has been ${agent.enabled ? 'disabled' : 'enabled'}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update agent status.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const openConfigDialog = (agent: AgentConfig) => {
    setSelectedAgent(agent);
    // Pre-fill with existing system prompt if available
    setSystemPrompt((agent as Record<string, unknown>).systemPrompt as string || '');
    setConfigDialogOpen(true);
  };

  const handleToggleFromDialog = async (checked: boolean) => {
    if (!selectedAgent) return;
    try {
      const res = await fetch('/api/ai-agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id, enabled: checked }),
      });
      if (res.ok) {
        setSelectedAgent({ ...selectedAgent, enabled: checked });
        setAgents((prev) =>
          prev.map((a) => (a.id === selectedAgent.id ? { ...a, enabled: checked } : a)),
        );
        toast({
          title: checked ? 'Agent Enabled' : 'Agent Disabled',
          description: `${selectedAgent.name} has been ${checked ? 'enabled' : 'disabled'}.`,
        });
      } else {
        toast({ title: 'Error', description: 'Failed to update agent status.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedAgent) return;
    setSavingConfig(true);
    try {
      const payload: Record<string, unknown> = { agentId: selectedAgent.id };
      if (systemPrompt.trim()) {
        payload.systemPrompt = systemPrompt.trim();
      }
      const res = await fetch('/api/ai-agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast({
          title: 'Configuration Saved',
          description: `${selectedAgent.name} configuration has been updated.`,
        });
        setConfigDialogOpen(false);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save configuration.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong.',
        variant: 'destructive',
      });
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-7 h-7 text-emerald-600" />
            AI Agents
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure and monitor your 5 AI agents for automated lead management and customer engagement.
          </p>
        </div>
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 shrink-0 mt-1">
          <Zap className="w-3 h-3 mr-1" />
          {agents.filter((a) => a.enabled).length}/{agents.length} Active
        </Badge>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {agents.map((agent) => {
          const colors = AGENT_COLORS[agent.id] ?? { bg: 'bg-gray-50', border: 'border-gray-200', iconBg: 'bg-gray-100' };
          const icon = AGENT_ICONS[agent.id] ?? <Bot className="w-6 h-6 text-gray-600" />;

          return (
            <Card
              key={agent.id}
              className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${
                agent.enabled ? `border-l-4 ${colors.border}` : 'opacity-75'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${colors.iconBg}`}>
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            agent.enabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                        >
                          {agent.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Agent #{agent.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <Badge
                      key={cap}
                      variant="secondary"
                      className="text-xs bg-muted/50"
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>

                <Separator />

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {togglingId === agent.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      <button
                        onClick={() => isSuperAdmin && handleToggle(agent)}
                        className="cursor-pointer"
                        disabled={!isSuperAdmin}
                      >
                        {agent.enabled ? (
                          <ToggleRight className="w-8 h-8 text-emerald-500 hover:text-emerald-600 transition-colors" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400 hover:text-gray-500 transition-colors" />
                        )}
                      </button>
                    )}
                    <Label className="text-xs text-muted-foreground">
                      {agent.enabled ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>

                  {isSuperAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => openConfigDialog(agent)}
                    >
                      <Settings2 className="w-3.5 h-3.5 mr-1" />
                      Configure
                    </Button>
                  )}
                </div>

                {!isSuperAdmin && (
                  <p className="text-xs text-muted-foreground text-center">
                    Contact Super Admin to change settings
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            How AI Agents Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {agents.map((agent) => {
              const colors = AGENT_COLORS[agent.id] ?? { iconBg: 'bg-gray-100' };
              const icon = AGENT_ICONS[agent.id] ?? <Bot className="w-5 h-5" />;
              return (
                <div key={agent.id} className="flex items-start gap-3">
                  <div className={`rounded-lg p-1.5 ${colors.iconBg} shrink-0 mt-0.5`}>
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' })}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{agent.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {agent.capabilities[0]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Agents learn from your data to improve over time
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" />
              All AI actions are audit-logged for transparency
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Configure {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Modify the system prompt for this AI agent. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="agent-status">Status</Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="agent-status"
                  checked={selectedAgent?.enabled ?? false}
                  onCheckedChange={handleToggleFromDialog}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedAgent?.enabled ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="system-prompt">System Prompt (Optional Override)</Label>
              <Textarea
                id="system-prompt"
                placeholder="Enter a custom system prompt for this agent..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={6}
                className="text-xs font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the default system prompt. The prompt defines the agent&apos;s behavior and personality.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
