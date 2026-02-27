import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { seoPrerender } from './seoPrerender';

function createMockReq(path: string, ua: string): Partial<Request> {
  return {
    path,
    headers: { 'user-agent': ua },
  };
}

function createMockRes() {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis() as any,
    set: vi.fn().mockReturnThis() as any,
    send: vi.fn().mockReturnThis() as any,
    setHeader: vi.fn().mockReturnThis() as any,
  };
  return res;
}

describe('SEO Prerender Middleware', () => {
  it('should pass through for regular browser user agents', () => {
    const req = createMockReq('/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('should return prerendered HTML for Googlebot', () => {
    const req = createMockReq('/', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('猎手阿尔法');
    expect(html).toContain('<h1>');
    expect(html).toContain('og:title');
    expect(html).toContain('twitter:card');
    expect(html).toContain('canonical');
  });

  it('should return prerendered HTML for Baiduspider', () => {
    const req = createMockReq('/', 'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return prerendered HTML for Bingbot', () => {
    const req = createMockReq('/', 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return prerendered HTML for Facebook crawler', () => {
    const req = createMockReq('/', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return prerendered HTML for Twitter bot', () => {
    const req = createMockReq('/', 'Twitterbot/1.0');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should serve correct meta for /crypto-investment', () => {
    const req = createMockReq('/crypto-investment', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('数字货币投资看板');
    expect(html).toContain('主流币');
    expect(html).toContain('Meme币');
    expect(html).toContain('/crypto-investment');
  });

  it('should serve correct meta for /about', () => {
    const req = createMockReq('/about', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('关于');
    expect(html).toContain('数据模型');
    expect(html).toContain('/about');
  });

  it('should serve correct meta for /stock/:symbol', () => {
    const req = createMockReq('/stock/000001.SS', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('000001.SS');
    expect(html).toContain('个股详情');
    expect(html).toContain('K线图');
  });

  it('should pass through API requests even for bots', () => {
    const req = createMockReq('/api/trpc/market.indices', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('should pass through static asset requests for bots', () => {
    const req = createMockReq('/favicon.ico', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  it('should pass through JS/CSS requests for bots', () => {
    const req = createMockReq('/assets/main.abc123.js', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('should set X-Prerendered header', () => {
    const req = createMockReq('/', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-Prerendered': 'true',
    }));
  });

  it('should include JSON-LD structured data for homepage', () => {
    const req = createMockReq('/', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('application/ld+json');
    expect(html).toContain('FinanceApplication');
  });

  it('should handle empty user-agent gracefully', () => {
    const req: Partial<Request> = {
      path: '/',
      headers: {},
    };
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    expect(next).toHaveBeenCalled();
  });

  it('should return 404 meta for unknown paths', () => {
    const req = createMockReq('/nonexistent-page', 'Googlebot/2.1');
    const res = createMockRes();
    const next = vi.fn();

    seoPrerender(req as Request, res as Response, next as NextFunction);

    const html = (res.send as any).mock.calls[0][0] as string;
    expect(html).toContain('页面未找到');
    expect(html).toContain('返回首页');
  });
});
