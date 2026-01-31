import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Eye, EyeOff, Lock, Mail, ArrowRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate(isAdmin ? '/admin' : '/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password) {
      setError('请填写邮箱和密码');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        const isAdminLogin = email === 'admin@hunteralpha.com';
        navigate(isAdminLogin ? '/admin' : '/dashboard');
      } else {
        setError('邮箱或密码错误，请重试');
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] data-grid flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 glow-gold">
            <Brain className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            猎手阿尔法 <span className="text-amber-500">HUNTER ALPHA</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">动态感知投资作战室</p>
        </div>

        <Card className="metric-card border-slate-700/50">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-xl text-white">用户登录</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              请输入您的账号密码以访问系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">邮箱地址</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/20" />
                  <span>记住我</span>
                </label>
                <Link to="/forgot-password" className="text-amber-500 hover:text-amber-400">
                  忘记密码？
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-2.5"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    登录中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    登录
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                还没有账号？{' '}
                <Link to="/register" className="text-amber-500 hover:text-amber-400 font-medium">
                  立即注册
                </Link>
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">测试账号：</p>
              <div className="space-y-1 text-xs font-mono">
                <p className="text-slate-400">
                  <span className="text-amber-500">管理员:</span> admin@hunteralpha.com / admin123
                </p>
                <p className="text-slate-400">
                  <span className="text-blue-500">普通用户:</span> 任意邮箱 / 密码≥6位
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
