// ===================================================================
// Admin — 管理员看板
// 用户管理 + 公告管理 + 投资看板权限管理 + 用户统计概览
// ===================================================================

import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useState, useRef, useMemo, useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, Users, Megaphone, Shield, ShieldCheck,
  Plus, Trash2, Edit, Eye, EyeOff, Upload,
  Save, X, Key, BarChart3, Clock, CheckCircle2,
  XCircle, Calendar, AlertTriangle, UserCheck, UserX,
  ChevronDown, Globe, Monitor, Smartphone, Tablet, Bot,
  MapPin, TrendingUp, Activity, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Tab = 'overview' | 'users' | 'permissions' | 'announcements' | 'visitors';

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [tab, setTab] = useState<Tab>('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield size={48} className="mx-auto text-red-500/40" />
          <h1 className="text-xl font-bold text-red-500">无权限访问</h1>
          <p className="text-red-500/60 text-sm">此页面仅限管理员访问</p>
          <Link href="/">
            <Button variant="outline" className="border-red-500/30 text-red-500">
              <ArrowLeft size={14} className="mr-1" /> 返回首页
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: '统计概览', icon: <BarChart3 size={14} /> },
    { key: 'permissions', label: '权限管理', icon: <Key size={14} /> },
    { key: 'users', label: '用户管理', icon: <Users size={14} /> },
    { key: 'announcements', label: '公告管理', icon: <Megaphone size={14} /> },
    { key: 'visitors', label: '访客统计', icon: <Globe size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-red-500/15 bg-background/95 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <button className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors">
              <ArrowLeft size={16} />
              <span className="text-xs">返回首页</span>
            </button>
          </Link>
          <div className="w-[1px] h-5 bg-red-500/15" />
          <h1 className="text-sm font-bold text-red-500 tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            ADMIN PANEL
          </h1>
          <div className="flex-1" />
          <div className="flex items-center gap-1 text-xs text-red-500/60">
            <ShieldCheck size={14} />
            <span>{user?.name}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 border-b border-red-500/10 pb-2 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.key
                  ? 'bg-red-500/10 text-red-500 border-b-2 border-red-500'
                  : 'text-red-500/50 hover:text-red-500/70'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'overview' && <OverviewPanel />}
        {tab === 'permissions' && <PermissionManagement />}
        {tab === 'users' && <UserManagement />}
        {tab === 'announcements' && <AnnouncementManagement />}
        {tab === 'visitors' && <VisitorAnalytics />}
      </div>
    </div>
  );
}

// ===================================================================
// Overview Panel — 统计概览
// ===================================================================
function OverviewPanel() {
  const { data: stats, isLoading } = trpc.admin.userStats.useQuery();
  const { data: users } = trpc.admin.listUsers.useQuery();

  if (isLoading) return <LoadingSpinner />;

  const recentUsers = users?.slice(-5).reverse() || [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-red-500">系统概览</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '总用户', value: stats?.total ?? 0, icon: <Users size={20} />, color: 'text-blue-400' },
          { label: '管理员', value: stats?.admins ?? 0, icon: <ShieldCheck size={20} />, color: 'text-red-400' },
          { label: '有看板权限', value: stats?.withAccess ?? 0, icon: <CheckCircle2 size={20} />, color: 'text-green-400' },
          { label: '已过期', value: stats?.expired ?? 0, icon: <AlertTriangle size={20} />, color: 'text-yellow-400' },
          { label: '无权限', value: stats?.noAccess ?? 0, icon: <XCircle size={20} />, color: 'text-red-500/60' },
        ].map((s, i) => (
          <div key={i} className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-red-500/60">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Users */}
      <div className="border border-red-500/10 rounded-lg p-4">
        <h3 className="text-sm font-bold text-red-500 mb-3">最近注册用户</h3>
        <div className="space-y-2">
          {recentUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2 border-b border-red-500/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-400">
                  {(u.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm text-foreground">{u.name || '未命名'}</div>
                  <div className="text-[10px] text-red-500/40">{u.email || '-'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  u.cryptoBoardAccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500/60'
                }`}>
                  {u.cryptoBoardAccess ? '有看板权限' : '无权限'}
                </span>
                <span className="text-[10px] text-red-500/40 font-mono">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Permission Management — 投资看板权限管理
// ===================================================================
function PermissionManagement() {
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const setAccess = trpc.admin.setCryptoBoardAccess.useMutation({
    onSuccess: () => { refetch(); toast.success('权限已更新'); },
    onError: (e: any) => toast.error(e.message),
  });
  const batchAccess = trpc.admin.batchSetCryptoBoardAccess.useMutation({
    onSuccess: (data: any) => { refetch(); setSelectedIds([]); toast.success(`已批量更新 ${data.count} 个用户`); },
    onError: (e: any) => toast.error(e.message),
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchAccess_, setBatchAccess_] = useState(true);
  const [batchExpiry, setBatchExpiry] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editExpiry, setEditExpiry] = useState('');
  const [editNote, setEditNote] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'none'>('all');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const now = new Date();
    return users.filter(u => {
      if (u.role === 'admin') return filter === 'all' || filter === 'active';
      if (filter === 'active') {
        return u.cryptoBoardAccess && (!u.accessExpiresAt || new Date(u.accessExpiresAt) > now);
      }
      if (filter === 'expired') {
        return u.cryptoBoardAccess && u.accessExpiresAt && new Date(u.accessExpiresAt) <= now;
      }
      if (filter === 'none') {
        return !u.cryptoBoardAccess;
      }
      return true;
    });
  }, [users, filter]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const nonAdminIds = filteredUsers.filter(u => u.role !== 'admin').map(u => u.id);
    setSelectedIds(prev => prev.length === nonAdminIds.length ? [] : nonAdminIds);
  };

  const handleBatchSubmit = () => {
    if (selectedIds.length === 0) return;
    batchAccess.mutate({
      userIds: selectedIds,
      access: batchAccess_,
      expiresAt: batchExpiry ? new Date(batchExpiry).toISOString() : null,
      note: batchNote || undefined,
    });
    setShowBatchDialog(false);
  };

  const handleSingleAccess = (userId: number, access: boolean) => {
    if (access && editingUser === userId) {
      setAccess.mutate({
        userId,
        access: true,
        expiresAt: editExpiry ? new Date(editExpiry).toISOString() : null,
        note: editNote || undefined,
      });
      setEditingUser(null);
    } else if (access) {
      setEditingUser(userId);
      setEditExpiry('');
      setEditNote('');
    } else {
      setAccess.mutate({ userId, access: false });
    }
  };

  const getAccessStatus = (u: any) => {
    if (u.role === 'admin') return { label: '管理员(永久)', color: 'text-red-400 bg-red-500/10' };
    if (!u.cryptoBoardAccess) return { label: '无权限', color: 'text-red-500/50 bg-red-500/5' };
    if (u.accessExpiresAt && new Date(u.accessExpiresAt) <= new Date()) {
      return { label: '已过期', color: 'text-yellow-400 bg-yellow-500/10' };
    }
    if (u.accessExpiresAt) {
      const days = Math.ceil((new Date(u.accessExpiresAt).getTime() - Date.now()) / 86400000);
      return { label: `有效(剩${days}天)`, color: 'text-green-400 bg-green-500/10' };
    }
    return { label: '永久有效', color: 'text-green-400 bg-green-500/10' };
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-red-500">投资看板权限管理</h2>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="relative">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value as any)}
              className="appearance-none bg-background border border-red-500/20 text-red-500 text-xs rounded px-3 py-1.5 pr-7 focus:outline-none focus:border-red-500/50"
            >
              <option value="all">全部用户</option>
              <option value="active">有权限</option>
              <option value="expired">已过期</option>
              <option value="none">无权限</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500/50 pointer-events-none" />
          </div>
          {/* Batch Actions */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-500/60">已选 {selectedIds.length} 人</span>
              <Button
                size="sm"
                className="h-7 text-[10px] bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25"
                onClick={() => { setBatchAccess_(true); setShowBatchDialog(true); }}
              >
                <UserCheck size={12} className="mr-1" /> 批量授权
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
                onClick={() => { setBatchAccess_(false); setShowBatchDialog(true); }}
              >
                <UserX size={12} className="mr-1" /> 批量撤销
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Dialog */}
      {showBatchDialog && (
        <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/5 space-y-3">
          <h3 className="text-sm font-bold text-red-500">
            {batchAccess_ ? '批量授权投资看板' : '批量撤销投资看板权限'}
          </h3>
          {batchAccess_ && (
            <>
              <div>
                <label className="text-xs text-red-500/60 block mb-1">到期时间（留空为永久）</label>
                <input
                  type="datetime-local"
                  value={batchExpiry}
                  onChange={e => setBatchExpiry(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-background border border-red-500/20 text-foreground text-sm focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-red-500/60 block mb-1">备注</label>
                <input
                  type="text"
                  value={batchNote}
                  onChange={e => setBatchNote(e.target.value)}
                  placeholder="如：试用期30天"
                  className="w-full px-3 py-2 rounded bg-background border border-red-500/20 text-foreground text-sm focus:outline-none focus:border-red-500/50"
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBatchDialog(false)} className="border-red-500/20 text-red-500">取消</Button>
            <Button
              size="sm"
              onClick={handleBatchSubmit}
              disabled={batchAccess.isPending}
              className={batchAccess_ ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'}
            >
              确认{batchAccess_ ? '授权' : '撤销'} ({selectedIds.length}人)
            </Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-red-500/60 text-xs border-b border-red-500/10">
              <th className="text-left py-2 px-2 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length > 0 && selectedIds.length === filteredUsers.filter(u => u.role !== 'admin').length}
                  onChange={selectAll}
                  className="accent-red-500"
                />
              </th>
              <th className="text-left py-2 px-2">用户</th>
              <th className="text-left py-2 px-2">权限状态</th>
              <th className="text-left py-2 px-2">到期时间</th>
              <th className="text-left py-2 px-2">备注</th>
              <th className="text-left py-2 px-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => {
              const status = getAccessStatus(u);
              const isEditing = editingUser === u.id;
              return (
                <tr key={u.id} className="border-b border-red-500/5 hover:bg-red-500/3">
                  <td className="py-2 px-2">
                    {u.role !== 'admin' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="accent-red-500"
                      />
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-[10px] font-bold text-red-400">
                        {(u.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-foreground">{u.name || '未命名'}</div>
                        <div className="text-[10px] text-red-500/40">{u.email || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${status.color}`}>
                      {u.cryptoBoardAccess || u.role === 'admin' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {status.label}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-xs text-red-500/50 font-mono">
                    {u.role === 'admin' ? '—' : u.accessExpiresAt ? new Date(u.accessExpiresAt).toLocaleDateString() : (u.cryptoBoardAccess ? '永久' : '—')}
                  </td>
                  <td className="py-2 px-2 text-xs text-red-500/50 max-w-[120px] truncate">
                    {u.accessNote || '—'}
                  </td>
                  <td className="py-2 px-2">
                    {u.role === 'admin' ? (
                      <span className="text-[10px] text-red-500/40">管理员</span>
                    ) : isEditing ? (
                      <div className="space-y-1.5 min-w-[200px]">
                        <input
                          type="datetime-local"
                          value={editExpiry}
                          onChange={e => setEditExpiry(e.target.value)}
                          className="w-full px-2 py-1 rounded bg-background border border-red-500/20 text-foreground text-[11px] focus:outline-none focus:border-red-500/50"
                          placeholder="留空为永久"
                        />
                        <input
                          type="text"
                          value={editNote}
                          onChange={e => setEditNote(e.target.value)}
                          placeholder="备注（可选）"
                          className="w-full px-2 py-1 rounded bg-background border border-red-500/20 text-foreground text-[11px] focus:outline-none focus:border-red-500/50"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-green-500/15 text-green-400 border border-green-500/30"
                            onClick={() => handleSingleAccess(u.id, true)}
                            disabled={setAccess.isPending}
                          >
                            <CheckCircle2 size={10} className="mr-0.5" /> 确认授权
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] border-red-500/20 text-red-500"
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {u.cryptoBoardAccess ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] border-red-500/20 text-red-400"
                            onClick={() => handleSingleAccess(u.id, false)}
                            disabled={setAccess.isPending}
                          >
                            <XCircle size={10} className="mr-0.5" /> 撤销
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] border-green-500/20 text-green-400"
                            onClick={() => handleSingleAccess(u.id, true)}
                          >
                            <CheckCircle2 size={10} className="mr-0.5" /> 授权
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filteredUsers.length === 0 && (
        <div className="text-center py-12 text-red-500/40">
          <Users size={32} className="mx-auto mb-2" />
          <p className="text-sm">暂无匹配用户</p>
        </div>
      )}

      {/* ===== 页面访问权限控制 ===== */}
      <PageAccessControl />
    </div>
  );
}

// ===================================================================
// Page Access Control — 页面访问权限控制
// ===================================================================
function PageAccessControl() {
  const { data: config, isLoading, refetch } = trpc.admin.getPageAccessConfig.useQuery();
  const updateAccess = trpc.admin.updatePageAccess.useMutation({
    onSuccess: () => { refetch(); toast.success('页面权限已更新'); },
    onError: (e: any) => toast.error(e.message),
  });
  const openAll = trpc.admin.openAllPages.useMutation({
    onSuccess: () => { refetch(); toast.success('已一键开放所有页面'); },
    onError: (e: any) => toast.error(e.message),
  });
  const restrictAll = trpc.admin.restrictAllPages.useMutation({
    onSuccess: () => { refetch(); toast.success('已一键限制所有页面'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!config) return null;

  const { rules, isOpenAll } = config;

  const handleToggle = (pagePath: string, field: 'guest' | 'user', currentValue: number) => {
    const rule = rules.find((r: any) => r.pagePath === pagePath);
    if (!rule) return;
    const newVal = currentValue === 1 ? 0 : 1;
    updateAccess.mutate({
      pagePath,
      guestAccess: field === 'guest' ? newVal : rule.guestAccess,
      userAccess: field === 'user' ? newVal : rule.userAccess,
    });
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-red-500">页面访问权限控制</h2>
          <p className="text-xs text-red-500/50 mt-1">控制游客和注册用户可访问的页面（管理员后台始终仅限管理员）</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className={`h-8 text-xs ${
              isOpenAll
                ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            onClick={() => openAll.mutate()}
            disabled={openAll.isPending || isOpenAll}
          >
            <Eye size={14} className="mr-1" />
            {isOpenAll ? '✓ 已全站开放' : '一键全站开放'}
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
            onClick={() => {
              if (confirm('确定要限制所有页面吗？游客和注册用户将无法访问任何页面。')) {
                restrictAll.mutate();
              }
            }}
            disabled={restrictAll.isPending}
          >
            <EyeOff size={14} className="mr-1" /> 一键全站限制
          </Button>
        </div>
      </div>

      {/* Status indicator */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
        isOpenAll ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
      }`}>
        {isOpenAll ? (
          <><Eye size={14} /> 当前状态：全站开放 — 所有用户（含游客）可访问所有页面（不含管理员后台）</>
        ) : (
          <><AlertTriangle size={14} /> 当前状态：自定义权限 — 部分页面已限制访问</>
        )}
      </div>

      {/* Page access table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-red-500/60 text-xs border-b border-red-500/10">
              <th className="text-left py-2 px-3">页面</th>
              <th className="text-left py-2 px-3">路径</th>
              <th className="text-center py-2 px-3">
                <div className="flex items-center justify-center gap-1">
                  <Globe size={12} /> 游客访问
                </div>
              </th>
              <th className="text-center py-2 px-3">
                <div className="flex items-center justify-center gap-1">
                  <Users size={12} /> 注册用户
                </div>
              </th>
              <th className="text-center py-2 px-3">
                <div className="flex items-center justify-center gap-1">
                  <Shield size={12} /> 管理员
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule: any) => (
              <tr key={rule.pagePath} className="border-b border-red-500/5 hover:bg-red-500/3">
                <td className="py-3 px-3">
                  <span className="text-foreground font-medium">{rule.pageLabel}</span>
                </td>
                <td className="py-3 px-3">
                  <code className="text-xs text-red-500/50 bg-red-500/5 px-1.5 py-0.5 rounded font-mono">{rule.pagePath}</code>
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => handleToggle(rule.pagePath, 'guest', rule.guestAccess)}
                    disabled={updateAccess.isPending}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      rule.guestAccess === 1
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                    }`}
                  >
                    {rule.guestAccess === 1 ? <><Eye size={11} /> 允许</> : <><EyeOff size={11} /> 禁止</>}
                  </button>
                </td>
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={() => handleToggle(rule.pagePath, 'user', rule.userAccess)}
                    disabled={updateAccess.isPending}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      rule.userAccess === 1
                        ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25'
                    }`}
                  >
                    {rule.userAccess === 1 ? <><Eye size={11} /> 允许</> : <><EyeOff size={11} /> 禁止</>}
                  </button>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                    <ShieldCheck size={11} /> 始终允许
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-red-500/30 mt-2">
        提示：管理员后台（/admin）始终仅限管理员访问，不受以上设置影响。点击“允许/禁止”按钮可切换对应用户类型的访问权限。
      </div>
    </div>
  );
}

// ===================================================================
// User Management — 用户管理（角色管理）
// ===================================================================
function UserManagement() {
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { refetch(); toast.success('角色已更新'); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-red-500">注册用户列表</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-red-500/60 text-xs border-b border-red-500/10">
              <th className="text-left py-2 px-3">ID</th>
              <th className="text-left py-2 px-3">用户名</th>
              <th className="text-left py-2 px-3">邮箱</th>
              <th className="text-left py-2 px-3">角色</th>
              <th className="text-left py-2 px-3">看板权限</th>
              <th className="text-left py-2 px-3">注册时间</th>
              <th className="text-left py-2 px-3">最后登录</th>
              <th className="text-left py-2 px-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users?.map(u => (
              <tr key={u.id} className="border-b border-red-500/5 hover:bg-red-500/3">
                <td className="py-2 px-3 text-red-500/70 font-mono">{u.id}</td>
                <td className="py-2 px-3 text-red-400">{u.name || '-'}</td>
                <td className="py-2 px-3 text-red-500/60">{u.email || '-'}</td>
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                    u.role === 'admin'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {u.role === 'admin' ? <ShieldCheck size={10} /> : <Shield size={10} />}
                    {u.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-red-500/10 text-red-400' :
                    u.cryptoBoardAccess ? 'bg-green-500/10 text-green-400' : 'bg-red-500/5 text-red-500/50'
                  }`}>
                    {u.role === 'admin' ? '管理员' : u.cryptoBoardAccess ? '已授权' : '未授权'}
                  </span>
                </td>
                <td className="py-2 px-3 text-red-500/50 text-xs font-mono">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="py-2 px-3 text-red-500/50 text-xs font-mono">
                  {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString() : '-'}
                </td>
                <td className="py-2 px-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-6 border-red-500/20 text-red-500"
                    onClick={() => updateRole.mutate({ userId: u.id, role: u.role === 'admin' ? 'user' : 'admin' })}
                    disabled={updateRole.isPending}
                  >
                    {u.role === 'admin' ? '降为用户' : '升为管理员'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===================================================================
// Announcement Management
// ===================================================================
function AnnouncementManagement() {
  const { data: announcements, isLoading, refetch } = trpc.admin.listAnnouncements.useQuery();
  const createMut = trpc.admin.createAnnouncement.useMutation({
    onSuccess: () => { refetch(); setEditing(null); toast.success('公告已发布'); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateMut = trpc.admin.updateAnnouncement.useMutation({
    onSuccess: () => { refetch(); setEditing(null); toast.success('公告已更新'); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteMut = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: () => { refetch(); toast.success('公告已删除'); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadMut = trpc.admin.uploadImage.useMutation({
    onError: (e: any) => toast.error('图片上传失败: ' + e.message),
  });

  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const startNew = () => {
    setEditing('new');
    setTitle('');
    setContent('');
    setImageUrl('');
    setImageCaption('');
  };

  const startEdit = (ann: any) => {
    setEditing(ann.id);
    setTitle(ann.title);
    setContent(ann.content);
    setImageUrl(ann.imageUrl || '');
    setImageCaption(ann.imageCaption || '');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const result = await uploadMut.mutateAsync({
        base64,
        filename: file.name,
        contentType: file.type,
      });
      setImageUrl(result.url);
      toast.success('图片上传成功');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) {
      toast.error('标题和内容不能为空');
      return;
    }
    if (editing === 'new') {
      createMut.mutate({ title, content, imageUrl: imageUrl || undefined, imageCaption: imageCaption || undefined });
    } else if (typeof editing === 'number') {
      updateMut.mutate({ id: editing, title, content, imageUrl: imageUrl || undefined, imageCaption: imageCaption || undefined });
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-red-500">公告管理</h2>
        <Button onClick={startNew} className="bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500/25">
          <Plus size={14} className="mr-1" /> 发布公告
        </Button>
      </div>

      {/* Edit Form */}
      {editing !== null && (
        <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-red-500">{editing === 'new' ? '发布新公告' : '编辑公告'}</h3>
            <button onClick={() => setEditing(null)} className="text-red-500/50 hover:text-red-500"><X size={16} /></button>
          </div>
          <input
            type="text"
            placeholder="公告标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded bg-background border border-red-500/20 text-foreground text-sm focus:outline-none focus:border-red-500/50"
          />
          <textarea
            placeholder="公告内容"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded bg-background border border-red-500/20 text-foreground text-sm focus:outline-none focus:border-red-500/50 resize-none"
          />
          <div className="flex items-center gap-3">
            <input type="file" ref={fileRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploadMut.isPending}
              className="border-red-500/20 text-red-500"
            >
              {uploadMut.isPending ? (
                <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin mr-1" />
              ) : (
                <Upload size={12} className="mr-1" />
              )}
              上传图片
            </Button>
            {imageUrl && (
              <div className="flex items-center gap-2">
                <img src={imageUrl} alt="preview" className="w-10 h-10 object-cover rounded border border-red-500/20" />
                <button onClick={() => setImageUrl('')} className="text-red-500/50 hover:text-red-500"><X size={12} /></button>
              </div>
            )}
          </div>
          {imageUrl && (
            <input
              type="text"
              placeholder="图片说明（可选）"
              value={imageCaption}
              onChange={e => setImageCaption(e.target.value)}
              className="w-full px-3 py-2 rounded bg-background border border-red-500/20 text-foreground text-sm focus:outline-none focus:border-red-500/50"
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)} className="border-red-500/20 text-red-500">取消</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <Save size={12} className="mr-1" /> {editing === 'new' ? '发布' : '保存'}
            </Button>
          </div>
        </div>
      )}

      {/* Announcement List */}
      <div className="space-y-3">
        {announcements?.map(ann => (
          <div key={ann.id} className="border border-red-500/10 rounded-lg p-4 hover:border-red-500/20 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-red-400">{ann.title}</h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${ann.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {ann.isActive ? '已发布' : '已隐藏'}
                  </span>
                </div>
                <p className="text-xs text-red-500/70 mb-2">{ann.content}</p>
                {ann.imageUrl && (
                  <div className="mb-2">
                    <img src={ann.imageUrl} alt={ann.imageCaption || ''} className="max-h-20 rounded border border-red-500/10" />
                    {ann.imageCaption && <span className="text-[9px] text-red-500/50 block mt-0.5">{ann.imageCaption}</span>}
                  </div>
                )}
                <span className="text-[9px] text-red-500/40 font-mono">{new Date(ann.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateMut.mutate({ id: ann.id, isActive: ann.isActive ? 0 : 1 })}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                  title={ann.isActive ? '隐藏' : '显示'}
                >
                  {ann.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => startEdit(ann)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                  title="编辑"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => { if (confirm('确定删除此公告？')) deleteMut.mutate({ id: ann.id }); }}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!announcements || announcements.length === 0) && (
          <div className="text-center py-12 text-red-500/40">
            <Megaphone size={32} className="mx-auto mb-2" />
            <p className="text-sm">暂无公告</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================================================
// Visitor Analytics — 访客统计可视化面板
// ===================================================================
function VisitorAnalytics() {
  const [days, setDays] = useState(30);
  const { data: summary, isLoading: summaryLoading } = trpc.admin.visitorSummary.useQuery();
  const { data: dailyStats } = trpc.admin.visitorDailyStats.useQuery({ days });
  const { data: hourlyStats } = trpc.admin.visitorHourlyStats.useQuery();
  const { data: countryStats } = trpc.admin.visitorCountryStats.useQuery({ days });
  const { data: cityStats } = trpc.admin.visitorCityStats.useQuery({ days });
  const { data: topPages } = trpc.admin.visitorTopPages.useQuery({ days });
  const { data: deviceStats } = trpc.admin.visitorDeviceStats.useQuery({ days });
  const { data: recentVisitors } = trpc.admin.visitorRecentList.useQuery({ limit: 50 });
  const utils = trpc.useUtils();

  // Calculate period PV/UV from dailyStats
  const periodStats = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) return { periodPV: 0, periodUV: 0 };
    const periodPV = dailyStats.reduce((sum, d) => sum + Number(d.pv), 0);
    const periodUV = dailyStats.reduce((sum, d) => sum + Number(d.uv), 0);
    return { periodPV, periodUV };
  }, [dailyStats]);

  const timeRangeLabel = useMemo(() => {
    const labels: Record<number, string> = { 1: '今日', 7: '近7天', 14: '近14天', 30: '近30天', 90: '近90天', 365: '近一年' };
    return labels[days] || `近${days}天`;
  }, [days]);

  const refreshAll = () => {
    utils.admin.visitorSummary.invalidate();
    utils.admin.visitorDailyStats.invalidate();
    utils.admin.visitorHourlyStats.invalidate();
    utils.admin.visitorCountryStats.invalidate();
    utils.admin.visitorCityStats.invalidate();
    utils.admin.visitorTopPages.invalidate();
    utils.admin.visitorDeviceStats.invalidate();
    utils.admin.visitorRecentList.invalidate();
    toast.success('数据已刷新');
  };

  if (summaryLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-red-500 flex items-center gap-2">
          <Activity size={20} /> 访客统计分析
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="bg-red-500/5 border border-red-500/20 rounded px-3 py-1.5 text-xs text-red-400 focus:outline-none"
          >
            <option value={1}>今日</option>
            <option value={7}>近7天</option>
            <option value={14}>近14天</option>
            <option value={30}>近30天</option>
            <option value={90}>近90天</option>
            <option value={365}>近一年</option>
          </select>
          <button onClick={refreshAll} className="p-2 rounded hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: `${timeRangeLabel} PV`, value: periodStats.periodPV, icon: <Eye size={20} />, color: 'text-cyan-400' },
          { label: `${timeRangeLabel} UV`, value: periodStats.periodUV, icon: <Users size={20} />, color: 'text-green-400' },
          { label: '今日PV', value: summary?.todayPV ?? 0, icon: <TrendingUp size={20} />, color: 'text-blue-400' },
          { label: '今日UV', value: summary?.todayUV ?? 0, icon: <Globe size={20} />, color: 'text-purple-400' },
          { label: '今日热门地区', value: summary?.topCountry ?? '-', icon: <MapPin size={20} />, color: 'text-orange-400', isText: true },
        ].map((s, i) => (
          <div key={i} className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
            <div className={`font-bold text-foreground ${'isText' in s ? 'text-lg' : 'text-2xl'}`}>
              {'isText' in s ? s.value : Number(s.value).toLocaleString()}
            </div>
            <div className="text-xs text-red-500/60">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Daily PV/UV Chart */}
      <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
        <h3 className="text-sm font-bold text-red-500 mb-4">每日访问趋势</h3>
        <BarLineChart data={dailyStats || []} />
      </div>

      {/* Hourly Distribution */}
      <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
        <h3 className="text-sm font-bold text-red-500 mb-4">今日小时分布</h3>
        <HourlyChart data={hourlyStats || []} />
      </div>

      {/* Country + City Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
          <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1">
            <Globe size={14} /> 国家/地区分布
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(countryStats || []).map((c, i) => {
              const maxVisits = countryStats?.[0]?.visits ?? 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs w-6 text-red-500/40 text-right">#{i + 1}</span>
                  <span className="text-xs font-mono w-6 text-center">{countryCodeToFlag(c.countryCode || '')}</span>
                  <span className="text-xs text-foreground w-24 truncate">{c.country || '未知'}</span>
                  <div className="flex-1 h-4 bg-red-500/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/30 rounded"
                      style={{ width: `${(Number(c.visits) / Number(maxVisits)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-cyan-400 w-12 text-right">{Number(c.visits).toLocaleString()}</span>
                  <span className="text-[10px] text-red-500/40 w-10 text-right">{Number(c.uniqueIps)} IP</span>
                </div>
              );
            })}
            {(!countryStats || countryStats.length === 0) && (
              <div className="text-center py-6 text-red-500/40 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
          <h3 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-1">
            <MapPin size={14} /> 城市分布 TOP 20
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(cityStats || []).slice(0, 20).map((c, i) => {
              const maxVisits = cityStats?.[0]?.visits ?? 1;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs w-6 text-red-500/40 text-right">#{i + 1}</span>
                  <span className="text-xs font-mono w-6 text-center">{countryCodeToFlag(c.countryCode || '')}</span>
                  <span className="text-xs text-foreground w-28 truncate">{c.city || '未知'}</span>
                  <div className="flex-1 h-4 bg-red-500/5 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500/60 to-green-400/30 rounded"
                      style={{ width: `${(Number(c.visits) / Number(maxVisits)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-green-400 w-12 text-right">{Number(c.visits).toLocaleString()}</span>
                  <span className="text-[10px] text-red-500/40 w-10 text-right">{Number(c.uniqueIps)} IP</span>
                </div>
              );
            })}
            {(!cityStats || cityStats.length === 0) && (
              <div className="text-center py-6 text-red-500/40 text-sm">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Pages + Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
          <h3 className="text-sm font-bold text-red-500 mb-3">热门页面</h3>
          <div className="space-y-2">
            {(topPages || []).map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <span className="text-xs w-6 text-red-500/40 text-right">#{i + 1}</span>
                <span className="text-xs text-cyan-400 flex-1 truncate font-mono">{p.path}</span>
                <span className="text-xs text-foreground w-12 text-right">{Number(p.visits).toLocaleString()}</span>
                <span className="text-[10px] text-red-500/40 w-10 text-right">{Number(p.uniqueIps)} IP</span>
              </div>
            ))}
            {(!topPages || topPages.length === 0) && (
              <div className="text-center py-6 text-red-500/40 text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
          <h3 className="text-sm font-bold text-red-500 mb-3">设备 / 浏览器 / 操作系统</h3>
          <div className="space-y-4">
            {/* Devices */}
            <div>
              <div className="text-[10px] text-red-500/50 mb-1.5 uppercase tracking-wider">设备类型</div>
              <div className="flex gap-2 flex-wrap">
                {(deviceStats?.devices || []).map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/5 border border-red-500/10">
                    {d.name === 'desktop' ? <Monitor size={12} className="text-blue-400" /> :
                     d.name === 'mobile' ? <Smartphone size={12} className="text-green-400" /> :
                     d.name === 'tablet' ? <Tablet size={12} className="text-purple-400" /> :
                     d.name === 'bot' ? <Bot size={12} className="text-yellow-400" /> :
                     <Monitor size={12} className="text-red-500/40" />}
                    <span className="text-xs text-foreground">{d.name || '未知'}</span>
                    <span className="text-xs text-red-500/50">{Number(d.count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Browsers */}
            <div>
              <div className="text-[10px] text-red-500/50 mb-1.5 uppercase tracking-wider">浏览器</div>
              <div className="flex gap-2 flex-wrap">
                {(deviceStats?.browsers || []).map((b, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/5 border border-red-500/10">
                    <span className="text-xs text-foreground">{b.name || '未知'}</span>
                    <span className="text-xs text-red-500/50">{Number(b.count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* OS */}
            <div>
              <div className="text-[10px] text-red-500/50 mb-1.5 uppercase tracking-wider">操作系统</div>
              <div className="flex gap-2 flex-wrap">
                {(deviceStats?.oses || []).map((o, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/5 border border-red-500/10">
                    <span className="text-xs text-foreground">{o.name || '未知'}</span>
                    <span className="text-xs text-red-500/50">{Number(o.count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Visitors Table */}
      <div className="border border-red-500/10 rounded-lg p-4 bg-red-500/3">
        <h3 className="text-sm font-bold text-red-500 mb-3">最近访客记录</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-red-500/10">
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">时间</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">IP</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">地区</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">城市</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">页面</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">设备</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">浏览器</th>
                <th className="text-left py-2 px-2 text-red-500/60 font-medium">系统</th>
              </tr>
            </thead>
            <tbody>
              {(recentVisitors || []).map((v, i) => (
                <tr key={v.id || i} className="border-b border-red-500/5 hover:bg-red-500/5 transition-colors">
                  <td className="py-2 px-2 text-red-500/60 whitespace-nowrap">
                    {v.createdAt ? new Date(v.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-2 px-2 text-cyan-400 font-mono">{v.ip}</td>
                  <td className="py-2 px-2 text-foreground">
                    {countryCodeToFlag(v.countryCode || '')} {v.country || '-'}
                  </td>
                  <td className="py-2 px-2 text-foreground">{v.city || '-'}</td>
                  <td className="py-2 px-2 text-cyan-400/80 font-mono max-w-[200px] truncate">{v.path}</td>
                  <td className="py-2 px-2 text-foreground">
                    {v.deviceType === 'desktop' ? <Monitor size={12} className="inline text-blue-400" /> :
                     v.deviceType === 'mobile' ? <Smartphone size={12} className="inline text-green-400" /> :
                     v.deviceType === 'tablet' ? <Tablet size={12} className="inline text-purple-400" /> :
                     v.deviceType === 'bot' ? <Bot size={12} className="inline text-yellow-400" /> :
                     <span>-</span>}
                  </td>
                  <td className="py-2 px-2 text-foreground">{v.browser || '-'}</td>
                  <td className="py-2 px-2 text-foreground">{v.os || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!recentVisitors || recentVisitors.length === 0) && (
            <div className="text-center py-8 text-red-500/40 text-sm">暂无访客记录</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================================================================
// Canvas Charts for Visitor Analytics
// ===================================================================

/** Country code to flag emoji */
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const c = code.toUpperCase();
  return String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65, 0x1F1E6 + c.charCodeAt(1) - 65);
}

/** Daily PV/UV bar+line chart */
function BarLineChart({ data }: { data: Array<{ date: string; pv: number; uv: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 20, right: 50, bottom: 40, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const maxPV = Math.max(...data.map(d => Number(d.pv)), 1);
    const maxUV = Math.max(...data.map(d => Number(d.uv)), 1);
    const maxVal = Math.max(maxPV, maxUV);
    const barW = Math.max(4, (cw / data.length) * 0.6);
    const gap = cw / data.length;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,50,50,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (ch / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      // Y labels
      ctx.fillStyle = 'rgba(255,50,50,0.35)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(maxVal * (1 - i / 4)).toString(), pad.left - 6, y + 3);
    }

    // PV bars
    data.forEach((d, i) => {
      const x = pad.left + i * gap + (gap - barW) / 2;
      const barH = (Number(d.pv) / maxVal) * ch;
      const y = pad.top + ch - barH;
      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, 'rgba(0,180,255,0.4)');
      gradient.addColorStop(1, 'rgba(0,180,255,0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barW, barH);
    });

    // UV line
    ctx.beginPath();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    data.forEach((d, i) => {
      const x = pad.left + i * gap + gap / 2;
      const y = pad.top + ch - (Number(d.uv) / maxVal) * ch;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // UV dots
    data.forEach((d, i) => {
      const x = pad.left + i * gap + gap / 2;
      const y = pad.top + ch - (Number(d.uv) / maxVal) * ch;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#00ff88';
      ctx.fill();
    });

    // X labels (show every N labels to avoid overlap)
    const labelStep = Math.max(1, Math.floor(data.length / 10));
    ctx.fillStyle = 'rgba(255,50,50,0.35)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      if (i % labelStep !== 0 && i !== data.length - 1) return;
      const x = pad.left + i * gap + gap / 2;
      const label = String(d.date).slice(5); // MM-DD
      ctx.fillText(label, x, h - pad.bottom + 16);
    });

    // Legend
    ctx.fillStyle = 'rgba(0,180,255,0.5)';
    ctx.fillRect(w - pad.right - 80, 6, 10, 10);
    ctx.fillStyle = 'rgba(255,50,50,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('PV', w - pad.right - 66, 15);
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(w - pad.right - 35, 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,50,50,0.5)';
    ctx.fillText('UV', w - pad.right - 26, 15);
  }, [data]);

  if (!data.length) return <div className="text-center py-8 text-red-500/40 text-sm">暂无数据</div>;

  return <canvas ref={canvasRef} className="w-full" style={{ height: 260 }} />;
}

/** Hourly distribution bar chart */
function HourlyChart({ data }: { data: Array<{ hour: number; pv: number; uv: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = { top: 15, right: 20, bottom: 30, left: 40 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    // Fill all 24 hours
    const hours = Array.from({ length: 24 }, (_, i) => {
      const found = data.find(d => Number(d.hour) === i);
      return { hour: i, pv: found ? Number(found.pv) : 0, uv: found ? Number(found.uv) : 0 };
    });

    const maxVal = Math.max(...hours.map(h => h.pv), 1);
    const barW = Math.max(4, (cw / 24) * 0.7);
    const gap = cw / 24;

    // Bars
    hours.forEach((h, i) => {
      const x = pad.left + i * gap + (gap - barW) / 2;
      const barH = (h.pv / maxVal) * ch;
      const y = pad.top + ch - barH;
      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, 'rgba(0,212,255,0.6)');
      gradient.addColorStop(1, 'rgba(0,212,255,0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barW, barH);
    });

    // X labels
    ctx.fillStyle = 'rgba(255,50,50,0.35)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    hours.forEach((h, i) => {
      if (i % 3 !== 0) return;
      const x = pad.left + i * gap + gap / 2;
      ctx.fillText(`${h.hour}:00`, x, pad.top + ch + 16);
    });

    // Y labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 3; i++) {
      const y = pad.top + (ch / 3) * i;
      ctx.fillText(Math.round(maxVal * (1 - i / 3)).toString(), pad.left - 6, y + 3);
    }
  }, [data]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 180 }} />;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
