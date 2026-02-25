// ===================================================================
// Admin — 管理员看板
// 用户管理 + 公告管理（含图片上传）
// ===================================================================

import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useState, useRef } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft, Users, Megaphone, Shield, ShieldCheck,
  Plus, Trash2, Edit, Eye, EyeOff, Upload, Image as ImageIcon,
  Save, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Tab = 'users' | 'announcements';

export default function AdminPage() {
  const { user, isAuthenticated, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [tab, setTab] = useState<Tab>('announcements');

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
        <div className="flex gap-2 border-b border-red-500/10 pb-2">
          <button
            onClick={() => setTab('announcements')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tab === 'announcements'
                ? 'bg-red-500/10 text-red-500 border-b-2 border-red-500'
                : 'text-red-500/50 hover:text-red-500/70'
            }`}
          >
            <Megaphone size={14} /> 公告管理
          </button>
          <button
            onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              tab === 'users'
                ? 'bg-red-500/10 text-red-500 border-b-2 border-red-500'
                : 'text-red-500/50 hover:text-red-500/70'
            }`}
          >
            <Users size={14} /> 用户管理
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'users' ? <UserManagement /> : <AnnouncementManagement />}
      </div>
    </div>
  );
}

// ===================================================================
// User Management
// ===================================================================
function UserManagement() {
  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();
  const updateRole = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => { refetch(); toast.success('角色已更新'); },
    onError: (e) => toast.error(e.message),
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
              <th className="text-left py-2 px-3">注册时间</th>
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
                <td className="py-2 px-3 text-red-500/50 text-xs font-mono">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
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
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.admin.updateAnnouncement.useMutation({
    onSuccess: () => { refetch(); setEditing(null); toast.success('公告已更新'); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMut = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: () => { refetch(); toast.success('公告已删除'); },
    onError: (e) => toast.error(e.message),
  });
  const uploadMut = trpc.admin.uploadImage.useMutation({
    onError: (e) => toast.error('图片上传失败: ' + e.message),
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

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
