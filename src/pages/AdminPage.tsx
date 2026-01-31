import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Brain, 
  Users, 
  UserCheck, 
  UserX, 
  Shield, 
  LogOut, 
  Search, 
  Trash2, 
  Power,
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  ChevronLeft
} from 'lucide-react';
// import { Separator } from '@/components/ui/separator';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, logout, users, toggleUserStatus, deleteUser, getUserStats, isAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Redirect if not admin
  if (!isAdmin) {
    navigate('/login');
    return null;
  }

  const stats = getUserStats();

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (userId: string) => {
    setSelectedUserId(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedUserId) {
      deleteUser(selectedUserId);
      setDeleteDialogOpen(false);
      setSelectedUserId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] data-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-[#0a0c10]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">猎手阿尔法</h1>
                  <p className="text-xs text-slate-500">管理员控制台</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30">
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400 font-medium">管理员</span>
              </div>
              <div className="text-sm text-slate-400">
                {user?.username}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-slate-400 hover:text-red-400"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">总用户数</p>
                  <p className="text-2xl font-bold text-white font-mono">{stats.total}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">活跃用户</p>
                  <p className="text-2xl font-bold text-green-400 font-mono">{stats.active}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">禁用用户</p>
                  <p className="text-2xl font-bold text-red-400 font-mono">{stats.total - stats.active}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">今日新增</p>
                  <p className="text-2xl font-bold text-amber-400 font-mono">{stats.todayNew}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card className="metric-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg text-white">用户管理</CardTitle>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="搜索用户名或邮箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-64 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700/50 hover:bg-transparent">
                    <TableHead className="text-slate-400">用户信息</TableHead>
                    <TableHead className="text-slate-400">角色</TableHead>
                    <TableHead className="text-slate-400">状态</TableHead>
                    <TableHead className="text-slate-400">注册时间</TableHead>
                    <TableHead className="text-slate-400">最后登录</TableHead>
                    <TableHead className="text-slate-400 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-slate-800/50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-white">{u.username}</div>
                          <div className="text-sm text-slate-500">{u.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={u.role === 'admin' 
                            ? 'border-purple-500/30 text-purple-400 bg-purple-500/10' 
                            : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                          }
                        >
                          {u.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className={u.isActive ? 'text-green-400' : 'text-red-400'}>
                            {u.isActive ? '正常' : '已禁用'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {formatDate(u.lastLogin)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleUserStatus(u.id)}
                            disabled={u.id === 'admin-001'}
                            className={u.isActive 
                              ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                              : 'text-green-400 hover:text-green-300 hover:bg-green-500/10'
                            }
                          >
                            <Power className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(u.id)}
                            disabled={u.id === 'admin-001'}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500">未找到匹配的用户</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="metric-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <CardTitle className="text-lg text-white">系统状态</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-400">API 服务</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-sm">运行中</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-400">数据同步</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-sm">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                <span className="text-slate-400">行情推送</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-400 text-sm">实时</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">系统版本</span>
                <span className="text-slate-300 text-sm font-mono">v2.0.1</span>
              </div>
            </CardContent>
          </Card>

          <Card className="metric-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                <CardTitle className="text-lg text-white">操作日志</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                  <div>
                    <p className="text-slate-300">管理员登录系统</p>
                    <p className="text-xs text-slate-500">{formatDate(new Date().toISOString())}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                  <div>
                    <p className="text-slate-300">系统数据更新完成</p>
                    <p className="text-xs text-slate-500">{formatDate(new Date(Date.now() - 3600000).toISOString())}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5" />
                  <div>
                    <p className="text-slate-300">权重模型自动调整</p>
                    <p className="text-xs text-slate-500">{formatDate(new Date(Date.now() - 7200000).toISOString())}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              确认删除用户
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              此操作不可撤销。删除后，该用户的所有数据将被永久清除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
