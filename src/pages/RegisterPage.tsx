import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Eye, EyeOff, Lock, Mail, User, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated) {
    navigate('/dashboard');
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('请填写所有必填字段');
      return false;
    }

    if (formData.username.length < 3) {
      setError('用户名至少需要3个字符');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    if (!agreedToTerms) {
      setError('请阅读并同意服务条款');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const success = await register(formData.username, formData.email, formData.password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError('该邮箱已被注册');
      }
    } catch {
      setError('注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '未输入', color: 'text-slate-500' };
    
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { label: '太弱', color: 'text-red-500' },
      { label: '较弱', color: 'text-orange-500' },
      { label: '一般', color: 'text-yellow-500' },
      { label: '良好', color: 'text-blue-500' },
      { label: '优秀', color: 'text-green-500' },
    ];

    return { strength: score, ...levels[Math.min(score, 4)] };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-[#0a0c10] data-grid flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
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
              <UserPlus className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-xl text-white">创建账号</CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              注册成为猎手阿尔法用户，开启智能投资之旅
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
                <Label htmlFor="username" className="text-slate-300">用户名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="请输入用户名"
                    value={formData.username}
                    onChange={handleChange}
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">邮箱地址</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
                {formData.password && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">密码强度:</span>
                    <span className={passwordStrength.color}>{passwordStrength.label}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`w-4 h-1 rounded-full ${
                            i <= passwordStrength.strength
                              ? passwordStrength.strength <= 2
                                ? 'bg-red-500'
                                : passwordStrength.strength <= 3
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                              : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">确认密码</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle className="w-3 h-3" />
                    <span>密码匹配</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
                />
                <label htmlFor="terms" className="text-sm text-slate-400">
                  我已阅读并同意
                  <Link to="/terms" className="text-amber-500 hover:text-amber-400 mx-1">
                    服务条款
                  </Link>
                  和
                  <Link to="/privacy" className="text-amber-500 hover:text-amber-400 mx-1">
                    隐私政策
                  </Link>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold py-2.5"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    注册中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    创建账号
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                已有账号？{' '}
                <Link to="/login" className="text-amber-500 hover:text-amber-400 font-medium">
                  立即登录
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          注册即表示您同意接收我们的市场分析报告和投资资讯
        </p>
      </div>
    </div>
  );
}
