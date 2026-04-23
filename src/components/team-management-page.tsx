'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  UserCog,
  ShieldAlert,
  Loader2,
  Phone,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CreateUserDialog from '@/components/create-user-dialog';
import { useToast } from '@/hooks/use-toast';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  _count: { assignedLeads: number };
}

// ──────────────────────────────────────
// Constants
// ──────────────────────────────────────

const roleBadgeColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  SALES_REP: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Manager',
  SALES_REP: 'Sales Rep',
};

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ──────────────────────────────────────
// Component
// ──────────────────────────────────────

export default function TeamManagementPage({ user }: { user: TeamUser }) {
  const { toast } = useToast();

  // Access check
  if (user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Only Super Admins can manage team members.
        </p>
      </div>
    );
  }

  return <TeamManagementContent />;
}

function TeamManagementContent() {
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        toast({ title: 'Error', description: 'Failed to fetch team members', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to fetch team members', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  // Open edit dialog
  const openEditDialog = (u: UserItem) => {
    setSelectedUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPhone(u.phone ?? '');
    setEditRole(u.role);
    setEditOpen(true);
  };

  // Handle edit submit
  const handleEdit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          role: editRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: 'User updated successfully.' });
        setEditOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update user.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle toggle active
  const handleToggleActive = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !selectedUser.isActive }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: 'Success',
          description: `User ${selectedUser.isActive ? 'deactivated' : 'activated'} successfully.`,
        });
        setDeactivateOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to update user.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update user.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: 'User deleted successfully.' });
        setDeleteOpen(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error || 'Failed to delete user.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to delete user.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Team Management</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} team member{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
        {search && (
          <Button type="button" variant="ghost" size="icon" onClick={() => { setSearch(''); setSearchInput(''); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Member</TableHead>
                <TableHead className="text-xs font-semibold hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-xs font-semibold">Role</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold hidden md:table-cell">Last Login</TableHead>
                <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="text-center py-12">
                      <UserCog className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-medium">No team members found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {search ? 'Try adjusting your search.' : 'Click "Add Team Member" to get started.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((u) => (
                  <TableRow key={u.id} className="transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* Avatar with status dot */}
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm font-semibold">
                            {getInitials(u.name)}
                          </div>
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                              u.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {u.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${roleBadgeColors[u.role] ?? ''}`}
                      >
                        {roleLabels[u.role] ?? u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          u.isActive
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {u.lastLogin ? timeAgo(u.lastLogin) : 'Never'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(u)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit User</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                onClick={() => {
                                  setSelectedUser(u);
                                  setDeactivateOpen(true);
                                }}
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{u.isActive ? 'Deactivate' : 'Activate'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setDeleteOpen(true);
                                }}
                                disabled={u._count.assignedLeads > 0}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {u._count.assignedLeads > 0
                                ? `Cannot delete (${u._count.assignedLeads} leads assigned)`
                                : 'Delete User'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchUsers}
      />

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update details for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Phone</Label>
              <Input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES_REP">Sales Rep</SelectItem>
                  <SelectItem value="ADMIN">Manager (Admin)</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Confirmation */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.isActive ? 'Deactivate' : 'Activate'} Team Member
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedUser?.isActive ? 'deactivate' : 'activate'}{' '}
              <strong>{selectedUser?.name}</strong>?
              {selectedUser?.isActive && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Deactivating will prevent this user from logging in.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleActive}
              disabled={actionLoading}
              className={selectedUser?.isActive ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedUser?.isActive ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete{' '}
              <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
              <span className="block mt-2 text-red-600 font-medium">
                This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
