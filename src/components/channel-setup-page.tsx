'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  Facebook,
  Instagram,
  MessageCircle,
  Plug,
  Unplug,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  QrCode,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Separator } from '@/components/ui/separator';

interface UserProps {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ChannelConnection {
  id: string;
  channel: string;
  status: string;
  connectedAt: string | null;
  lastHeartbeatAt: string | null;
  metadata: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const CHANNEL_INFO: Record<string, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  FACEBOOK: {
    name: 'Facebook',
    icon: <Facebook className="w-6 h-6 text-blue-600" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Connect your Facebook Page to receive leads from Meta Ads and Messenger.',
  },
  INSTAGRAM: {
    name: 'Instagram',
    icon: <Instagram className="w-6 h-6 text-pink-600" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    description: 'Connect your Instagram Business account to capture DM leads and comments.',
  },
  WHATSAPP: {
    name: 'WhatsApp',
    icon: <MessageCircle className="w-6 h-6 text-emerald-600" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: 'Connect WhatsApp Business API for automated messaging and lead capture.',
  },
};

export default function ChannelSetupPage({ user }: { user: UserProps }) {
  const { toast } = useToast();
  const [channels, setChannels] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  // Dialog states
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  // Form state for Facebook/Instagram connection
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [pageAccessToken, setPageAccessToken] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/channels');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load channel data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const openConnectDialog = (channel: string) => {
    setSelectedChannel(channel);
    setConnectDialogOpen(true);
    // Reset form
    setAppId('');
    setAppSecret('');
    setPageAccessToken('');
    setPhoneNumber('');
  };

  const openDisconnectDialog = (channel: string) => {
    setSelectedChannel(channel);
    setDisconnectDialogOpen(true);
  };

  const handleConnect = async () => {
    if (!selectedChannel) return;
    setConnecting(selectedChannel);

    try {
      let metadata = {};
      let accessToken = '';

      if (selectedChannel === 'FACEBOOK') {
        if (!appId.trim() || !appSecret.trim() || !pageAccessToken.trim()) {
          toast({
            title: 'Missing Fields',
            description: 'Please fill in App ID, App Secret, and Page Access Token.',
            variant: 'destructive',
          });
          setConnecting(null);
          return;
        }
        metadata = { appId: appId.trim(), pageName: 'Sports Pavilion RWP' };
        accessToken = pageAccessToken.trim();
      } else if (selectedChannel === 'INSTAGRAM') {
        if (!appId.trim() || !appSecret.trim() || !pageAccessToken.trim()) {
          toast({
            title: 'Missing Fields',
            description: 'Please fill in App ID, App Secret, and Page Access Token.',
            variant: 'destructive',
          });
          setConnecting(null);
          return;
        }
        metadata = { appId: appId.trim(), linkedFbPage: 'Sports Pavilion RWP' };
        accessToken = pageAccessToken.trim();
      } else if (selectedChannel === 'WHATSAPP') {
        if (!phoneNumber.trim()) {
          toast({
            title: 'Missing Field',
            description: 'Please enter your WhatsApp Business phone number.',
            variant: 'destructive',
          });
          setConnecting(null);
          return;
        }
        metadata = { phoneNumber: phoneNumber.trim(), businessName: 'Sports Pavilion RWP' };
      }

      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selectedChannel,
          accessToken,
          metadata,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Channel Connected',
          description: `${CHANNEL_INFO[selectedChannel]?.name ?? selectedChannel} has been connected successfully.`,
        });
        setConnectDialogOpen(false);
        fetchChannels();
      } else {
        const data = await res.json();
        toast({
          title: 'Connection Failed',
          description: data.error || 'Failed to connect channel.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedChannel) return;
    setDisconnecting(true);

    try {
      const res = await fetch(`/api/channels?channel=${selectedChannel}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast({
          title: 'Channel Disconnected',
          description: `${CHANNEL_INFO[selectedChannel]?.name ?? selectedChannel} has been disconnected.`,
        });
        setDisconnectDialogOpen(false);
        fetchChannels();
      } else {
        const data = await res.json();
        toast({
          title: 'Disconnect Failed',
          description: data.error || 'Failed to disconnect channel.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'EXPIRED':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
            <AlertCircle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            <WifiOff className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
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
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Channel Setup</h2>
        <p className="text-muted-foreground mt-1">
          Connect your communication channels to capture leads and automate responses.
        </p>
      </div>

      {!isSuperAdmin && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">
                Channel configuration requires <strong>Super Admin</strong> access. Contact your administrator to manage channel connections.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(CHANNEL_INFO).map(([key, info]) => {
          const channel = channels.find((c) => c.channel === key);
          const status = channel?.status ?? 'DISCONNECTED';
          const isConnected = status === 'CONNECTED';
          const isExpired = status === 'EXPIRED';

          return (
            <Card key={key} className={`relative overflow-hidden transition-all duration-200 hover:shadow-md ${isConnected ? `border-l-4 ${info.borderColor}` : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-xl p-2.5 ${info.bgColor}`}>
                      {info.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{info.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {isConnected && channel?.connectedAt
                          ? `Connected ${new Date(channel.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Not connected'}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {info.description}
                </p>

                {/* Connection metadata preview */}
                {isConnected && channel?.metadata && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    {(() => {
                      try {
                        const meta = JSON.parse(channel.metadata);
                        return Object.entries(meta).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground capitalize">
                              {k.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="font-medium text-foreground">
                              {typeof v === 'string' && v.length > 20
                                ? v.substring(0, 20) + '...'
                                : String(v)}
                            </span>
                          </div>
                        ));
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openConnectDialog(key)}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Reconfigure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => openDisconnectDialog(key)}
                        disabled={!isSuperAdmin}
                      >
                        <Unplug className="w-3.5 h-3.5 mr-1.5" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      className={`flex-1 ${isExpired ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : ''}`}
                      onClick={() => openConnectDialog(key)}
                      disabled={!isSuperAdmin}
                    >
                      <Plug className="w-3.5 h-3.5 mr-1.5" />
                      {isExpired ? 'Reconnect' : 'Connect'}
                    </Button>
                  )}
                </div>

                {!isSuperAdmin && !isConnected && (
                  <p className="text-xs text-muted-foreground text-center">
                    Super Admin access required
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Help Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Setup Guides</CardTitle>
          <CardDescription>Step-by-step instructions for connecting each channel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Facebook className="w-4 h-4 text-blue-600" />
                Facebook Setup
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Create a Meta App at developers.facebook.com</li>
                <li>Add Facebook Login and Messenger products</li>
                <li>Copy App ID and App Secret</li>
                <li>Generate a Page Access Token with pages_messaging permission</li>
                <li>Subscribe your webhook to the page events</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Instagram className="w-4 h-4 text-pink-600" />
                Instagram Setup
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Use the same Meta App as Facebook</li>
                <li>Link your Instagram Business Account to your Facebook Page</li>
                <li>Add Instagram Graph API product</li>
                <li>Generate token with instagram_basic and instagram_manage_messages</li>
                <li>Subscribe to message and comment webhooks</li>
              </ol>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                WhatsApp Setup
              </h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Apply for WhatsApp Business API via Meta</li>
                <li>Verify your business phone number</li>
                <li>Configure webhook endpoint URL</li>
                <li>Set up message templates for automated replies</li>
                <li>Test with a QR code scan on your phone</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel && CHANNEL_INFO[selectedChannel]?.icon}
              Connect {selectedChannel ? CHANNEL_INFO[selectedChannel]?.name : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedChannel === 'WHATSAPP'
                ? 'Enter your WhatsApp Business phone number to start the connection process.'
                : 'Enter your Meta App credentials to connect this channel.'}
            </DialogDescription>
          </DialogHeader>

          {selectedChannel === 'WHATSAPP' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Business Phone Number</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+92 300 1234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-4 text-center space-y-3">
                <QrCode className="w-16 h-16 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  After submitting, scan the QR code from WhatsApp Business on your phone to complete the connection.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="appId">Meta App ID</Label>
                <Input
                  id="appId"
                  placeholder="e.g. 123456789012345"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSecret">App Secret</Label>
                <Input
                  id="appSecret"
                  type="password"
                  placeholder="Enter your App Secret"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Found in your Meta App Settings &gt; Basic &gt; App Secret
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageAccessToken">
                  {selectedChannel === 'INSTAGRAM' ? 'Page Access Token' : 'Page Access Token'}
                </Label>
                <Input
                  id="pageAccessToken"
                  type="password"
                  placeholder="EAAxxxxx..."
                  value={pageAccessToken}
                  onChange={(e) => setPageAccessToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Generate from Graph API Explorer with pages_messaging permission
                </p>
              </div>

              {selectedChannel === 'INSTAGRAM' && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-xs text-pink-700">
                    <strong>Note:</strong> Instagram must be linked to a Facebook Page. The Page Access Token
                    must have instagram_manage_messages permission. Make sure your Instagram account is set to
                    &quot;Business&quot; or &quot;Creator&quot; type.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConnect}
              disabled={connecting !== null}
            >
              {connecting === selectedChannel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {selectedChannel ? CHANNEL_INFO[selectedChannel]?.name : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the channel and stop receiving messages. Any leads received through this channel
              will remain in the CRM, but new messages won&apos;t be captured until you reconnect.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
