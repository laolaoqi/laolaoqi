// ===================================================================
// PageAccessGuard — 页面访问权限路由守卫
// 根据管理员设置的页面权限规则，拦截无权限用户
// ===================================================================

import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { useLocation } from 'wouter';
import { Shield, LogIn, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLoginUrl } from '@/const';
import type { ReactNode } from 'react';

interface PageAccessGuardProps {
  children: ReactNode;
}

export default function PageAccessGuard({ children }: PageAccessGuardProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Determine user type
  const userType = isAuthenticated
    ? (user?.role === 'admin' ? 'admin' : 'user')
    : 'guest';

  // Skip paths that don't need access control
  const skipPaths = ['/admin', '/404'];
  const shouldSkip = userType === 'admin' || skipPaths.some(p => location.startsWith(p));

  // Always call the hook (React rules), but disable when not needed
  const { data: accessResult, isLoading } = trpc.pageAccess.check.useQuery(
    { path: location },
    { enabled: !authLoading && !shouldSkip }
  );

  // Admin always has access, skip paths always pass
  if (shouldSkip) {
    return <>{children}</>;
  }

  // While loading auth or access check, show children to avoid flash
  if (authLoading || isLoading) {
    return <>{children}</>;
  }

  // If access is allowed or no rule found (default allow), show children
  if (!accessResult || accessResult.hasAccess) {
    return <>{children}</>;
  }

  // Access denied — show appropriate message
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-5 max-w-md px-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
          <Shield size={32} className="text-red-500/60" />
        </div>
        <h1 className="text-xl font-bold text-foreground">访问受限</h1>
        <p className="text-sm text-foreground/60">
          {userType === 'guest'
            ? '此页面需要登录后才能访问。请先登录您的账号。'
            : '您的账号暂无权限访问此页面。如需开通，请联系管理员。'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {userType === 'guest' && (
            <a href={getLoginUrl()}>
              <Button className="bg-red-500 text-white hover:bg-red-600">
                <LogIn size={14} className="mr-1.5" /> 登录账号
              </Button>
            </a>
          )}
          <a href="/">
            <Button variant="outline" className="border-red-500/30 text-red-500">
              <ArrowLeft size={14} className="mr-1.5" /> 返回首页
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
