// ===================================================================
// 猎手阿尔法 — i18n 多语言系统
// 支持：中文(zh) / 英语(en) / 日语(ja) / 韩语(ko) / 阿拉伯语(ar)
// ===================================================================

export type Lang = 'zh' | 'en' | 'ja' | 'ko' | 'ar';

export const LANGS: { id: Lang; label: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'zh', label: '中文', flag: '🇨🇳', dir: 'ltr' },
  { id: 'en', label: 'English', flag: '🇺🇸', dir: 'ltr' },
  { id: 'ja', label: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { id: 'ko', label: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { id: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
];

// Translation dictionary
const translations: Record<string, Record<Lang, string>> = {
  // === Brand ===
  'brand.name': { zh: '猎手阿尔法', en: 'HUNTER ALPHA', ja: 'ハンターアルファ', ko: '헌터 알파', ar: 'هنتر ألفا' },
  'brand.subtitle': { zh: '战术指挥中心', en: 'Tactical Command Center', ja: '戦術指揮センター', ko: '전술 지휘 센터', ar: 'مركز القيادة التكتيكية' },
  'brand.version': { zh: 'HUNTER ALPHA v2.0 — 战术指挥中心', en: 'HUNTER ALPHA v2.0 — Tactical Command Center', ja: 'HUNTER ALPHA v2.0 — 戦術指揮センター', ko: 'HUNTER ALPHA v2.0 — 전술 지휘 센터', ar: 'HUNTER ALPHA v2.0 — مركز القيادة التكتيكية' },
  'brand.disclaimer': { zh: '数据仅供参考，不构成投资建议', en: 'Data for reference only, not investment advice', ja: 'データは参考用であり、投資助言ではありません', ko: '데이터는 참고용이며 투자 조언이 아닙니다', ar: 'البيانات للمرجعية فقط، وليست نصيحة استثمارية' },

  // === TopBar ===
  'topbar.live': { zh: '实时数据', en: 'LIVE DATA', ja: 'リアルタイム', ko: '실시간', ar: 'بيانات حية' },
  'topbar.mock': { zh: '模拟数据', en: 'MOCK DATA', ja: 'モック', ko: '모의 데이터', ar: 'بيانات تجريبية' },
  'topbar.updated': { zh: '更新于', en: 'Updated', ja: '更新', ko: '업데이트', ar: 'تحديث' },
  'topbar.refresh': { zh: '刷新数据', en: 'Refresh', ja: '更新', ko: '새로고침', ar: 'تحديث' },
  'topbar.login': { zh: '登录', en: 'Login', ja: 'ログイン', ko: '로그인', ar: 'تسجيل الدخول' },
  'topbar.logout': { zh: '退出', en: 'Logout', ja: 'ログアウト', ko: '로그아웃', ar: 'تسجيل الخروج' },
  'topbar.guest': { zh: '游客', en: 'Guest', ja: 'ゲスト', ko: '게스트', ar: 'زائر' },

  // === Markets ===
  'market.cn': { zh: 'A股', en: 'A-Share', ja: 'A株', ko: 'A주', ar: 'أسهم A' },
  'market.hk': { zh: 'H股', en: 'HK Stock', ja: '香港株', ko: '홍콩주', ar: 'أسهم هونغ كونغ' },
  'market.us': { zh: '美股', en: 'US Stock', ja: '米国株', ko: '미국주', ar: 'أسهم أمريكية' },
  'market.crypto': { zh: '数字货币', en: 'Crypto', ja: '暗号資産', ko: '암호화폐', ar: 'عملات رقمية' },

  // === Trading Status ===
  'status.trading': { zh: '交易中', en: 'TRADING', ja: '取引中', ko: '거래중', ar: 'تداول' },
  'status.closed': { zh: '已收盘', en: 'CLOSED', ja: '閉場', ko: '마감', ar: 'مغلق' },
  'status.premarket': { zh: '盘前', en: 'PRE-MKT', ja: 'プレ', ko: '장전', ar: 'قبل السوق' },
  'status.afterhours': { zh: '盘后', en: 'AFTER-HRS', ja: 'アフター', ko: '장후', ar: 'بعد السوق' },
  'status.lunchbreak': { zh: '午休', en: 'LUNCH', ja: '昼休み', ko: '점심', ar: 'استراحة' },
  'status.24h': { zh: '24H交易', en: '24H TRADING', ja: '24H取引', ko: '24H거래', ar: 'تداول 24 ساعة' },

  // === Panels ===
  'panel.modeScores': { zh: '模式评分', en: 'MODE SCORES', ja: 'モードスコア', ko: '모드 점수', ar: 'درجات الوضع' },
  'panel.marketScan': { zh: '市场全景扫描', en: 'MARKET PANORAMA', ja: 'マーケットパノラマ', ko: '시장 파노라마', ar: 'بانوراما السوق' },
  'panel.tradingClock': { zh: '全球交易时钟', en: 'GLOBAL TRADING CLOCK', ja: 'グローバル取引時計', ko: '글로벌 거래 시계', ar: 'ساعة التداول العالمية' },
  'panel.weight': { zh: '动态权重分配', en: 'DYNAMIC WEIGHTS', ja: '動的ウェイト', ko: '동적 가중치', ar: 'الأوزان الديناميكية' },
  'panel.sentiment': { zh: '市场情绪指标', en: 'MARKET SENTIMENT', ja: '市場センチメント', ko: '시장 심리', ar: 'معنويات السوق' },
  'panel.news': { zh: '舆情摘要', en: 'NEWS DIGEST', ja: 'ニュースダイジェスト', ko: '뉴스 요약', ar: 'ملخص الأخبار' },
  'panel.topRec': { zh: '核心推荐 TOP 10', en: 'TOP 10 PICKS', ja: 'TOP 10 推奨', ko: 'TOP 10 추천', ar: 'أفضل 10 اختيارات' },
  'panel.riskControl': { zh: '风控与交易计划', en: 'RISK CONTROL', ja: 'リスク管理', ko: '리스크 관리', ar: 'إدارة المخاطر' },
  'panel.fearGreed': { zh: '恐惧贪婪指数', en: 'FEAR & GREED INDEX', ja: '恐怖と貪欲指数', ko: '공포 탐욕 지수', ar: 'مؤشر الخوف والطمع' },
  'panel.heatmap': { zh: '市场热力图', en: 'MARKET HEATMAP', ja: 'マーケットヒートマップ', ko: '시장 히트맵', ar: 'خريطة حرارية' },

  // === Mode Scores ===
  'mode.dominant': { zh: '当前主导模式', en: 'DOMINANT MODE', ja: '主導モード', ko: '지배 모드', ar: 'الوضع السائد' },
  'mode.attack': { zh: '进攻模式', en: 'ATTACK', ja: '攻撃モード', ko: '공격 모드', ar: 'وضع الهجوم' },
  'mode.defense': { zh: '防御模式', en: 'DEFENSE', ja: '防御モード', ko: '방어 모드', ar: 'وضع الدفاع' },
  'mode.oscillation': { zh: '震荡模式', en: 'OSCILLATION', ja: '振動モード', ko: '진동 모드', ar: 'وضع التذبذب' },
  'mode.attackLabel': { zh: '进攻', en: 'Attack', ja: '攻撃', ko: '공격', ar: 'هجوم' },
  'mode.defenseLabel': { zh: '防御', en: 'Defense', ja: '防御', ko: '방어', ar: 'دفاع' },
  'mode.oscillationLabel': { zh: '震荡', en: 'Oscillation', ja: '振動', ko: '진동', ar: 'تذبذب' },
  'mode.score': { zh: '分', en: 'pts', ja: '点', ko: '점', ar: 'نقطة' },

  // === Weights ===
  'weight.fundamental': { zh: '基本面', en: 'Fundamental', ja: 'ファンダメンタル', ko: '펀더멘털', ar: 'أساسي' },
  'weight.capitalFlow': { zh: '资金流', en: 'Capital Flow', ja: '資金フロー', ko: '자금 흐름', ar: 'تدفق رأس المال' },
  'weight.technical': { zh: '技术量', en: 'Technical', ja: 'テクニカル', ko: '기술적', ar: 'تقني' },
  'weight.autoAdjust': { zh: '权重根据市场模式自动调整', en: 'Weights auto-adjust by market mode', ja: 'ウェイトは市場モードに応じて自動調整', ko: '가중치는 시장 모드에 따라 자동 조정', ar: 'الأوزان تتكيف تلقائياً مع وضع السوق' },

  // === Sentiment ===
  'sentiment.risefall': { zh: '涨跌比', en: 'Rise/Fall Ratio', ja: '騰落比', ko: '등락비', ar: 'نسبة الصعود/الهبوط' },
  'sentiment.rise': { zh: '涨', en: 'Rise', ja: '上昇', ko: '상승', ar: 'صعود' },
  'sentiment.flat': { zh: '平', en: 'Flat', ja: '横ばい', ko: '보합', ar: 'مستقر' },
  'sentiment.fall': { zh: '跌', en: 'Fall', ja: '下落', ko: '하락', ar: 'هبوط' },
  'sentiment.limitUp': { zh: '涨停', en: 'Limit Up', ja: 'ストップ高', ko: '상한가', ar: 'الحد الأعلى' },
  'sentiment.limitDown': { zh: '跌停', en: 'Limit Down', ja: 'ストップ安', ko: '하한가', ar: 'الحد الأدنى' },

  // === News Digest ===
  'news.mainTone': { zh: '主基调', en: 'Main Tone', ja: '基調', ko: '기조', ar: 'النغمة الرئيسية' },
  'news.capitalTrend': { zh: '资金动向', en: 'Capital Trend', ja: '資金動向', ko: '자금 동향', ar: 'اتجاه رأس المال' },
  'news.strategy': { zh: '策略建议', en: 'Strategy', ja: '戦略提案', ko: '전략 제안', ar: 'اقتراح الاستراتيجية' },

  // === Recommendations Table ===
  'rec.rank': { zh: '#', en: '#', ja: '#', ko: '#', ar: '#' },
  'rec.name': { zh: '名称', en: 'Name', ja: '名称', ko: '이름', ar: 'الاسم' },
  'rec.code': { zh: '代码', en: 'Code', ja: 'コード', ko: '코드', ar: 'الرمز' },
  'rec.industry': { zh: '行业', en: 'Industry', ja: '業種', ko: '업종', ar: 'القطاع' },
  'rec.price': { zh: '现价', en: 'Price', ja: '現在値', ko: '현재가', ar: 'السعر' },
  'rec.change': { zh: '涨跌', en: 'Change', ja: '変動', ko: '변동', ar: 'التغير' },
  'rec.score': { zh: '评分', en: 'Score', ja: 'スコア', ko: '점수', ar: 'الدرجة' },
  'rec.signal': { zh: '信号', en: 'Signal', ja: 'シグナル', ko: '신호', ar: 'الإشارة' },
  'rec.flow': { zh: '资金流', en: 'Flow', ja: '資金', ko: '자금', ar: 'التدفق' },
  'rec.reason': { zh: '理由', en: 'Reason', ja: '理由', ko: '이유', ar: 'السبب' },
  'rec.nextUpdate': { zh: '下次更新', en: 'Next update', ja: '次回更新', ko: '다음 업데이트', ar: 'التحديث التالي' },

  // === Signals ===
  'signal.buy': { zh: '买入', en: 'BUY', ja: '買い', ko: '매수', ar: 'شراء' },
  'signal.add': { zh: '增持', en: 'ADD', ja: '追加', ko: '추가', ar: 'إضافة' },
  'signal.hold': { zh: '观望', en: 'HOLD', ja: '様子見', ko: '관망', ar: 'انتظار' },
  'signal.reduce': { zh: '减持', en: 'REDUCE', ja: '減少', ko: '축소', ar: 'تقليل' },

  // === Risk Control ===
  'risk.stopLoss': { zh: '止损策略', en: 'Stop Loss', ja: 'ストップロス', ko: '손절', ar: 'وقف الخسارة' },
  'risk.takeProfit': { zh: '止盈策略', en: 'Take Profit', ja: '利確', ko: '익절', ar: 'جني الأرباح' },
  'risk.position': { zh: '仓位建议', en: 'Position', ja: 'ポジション', ko: '포지션', ar: 'المركز' },
  'risk.current': { zh: '当前建议', en: 'Current', ja: '現在', ko: '현재', ar: 'الحالي' },
  'risk.bull': { zh: '牛市仓位', en: 'Bull Market', ja: '強気相場', ko: '강세장', ar: 'سوق صاعد' },
  'risk.bear': { zh: '熊市仓位', en: 'Bear Market', ja: '弱気相場', ko: '약세장', ar: 'سوق هابط' },
  'risk.hardStop': { zh: '硬止损线', en: 'Hard Stop Line', ja: 'ハードストップ', ko: '하드 스톱', ar: 'خط وقف صارم' },
  'risk.strictExec': { zh: '严格执行，不留侥幸', en: 'Execute strictly, no exceptions', ja: '厳格に実行', ko: '엄격히 실행', ar: 'تنفيذ صارم' },
  'risk.batchProfit': { zh: '分批止盈，锁定利润', en: 'Scale out, lock in profits', ja: '段階的に利確', ko: '분할 익절', ar: 'جني تدريجي' },
  'risk.dynamicAdjust': { zh: '根据市场模式动态调整', en: 'Adjust dynamically by market mode', ja: '市場モードに応じて調整', ko: '시장 모드에 따라 조정', ar: 'تعديل ديناميكي' },

  // === Fear & Greed ===
  'fg.extremeFear': { zh: '极度恐惧', en: 'Extreme Fear', ja: '極度の恐怖', ko: '극도의 공포', ar: 'خوف شديد' },
  'fg.fear': { zh: '恐惧', en: 'Fear', ja: '恐怖', ko: '공포', ar: 'خوف' },
  'fg.neutral': { zh: '中性', en: 'Neutral', ja: '中立', ko: '중립', ar: 'محايد' },
  'fg.greed': { zh: '贪婪', en: 'Greed', ja: '貪欲', ko: '탐욕', ar: 'طمع' },
  'fg.extremeGreed': { zh: '极度贪婪', en: 'Extreme Greed', ja: '極度の貪欲', ko: '극도의 탐욕', ar: 'طمع شديد' },

  // === Market Overview ===
  'overview.realtime': { zh: '实时更新中', en: 'Real-time updates', ja: 'リアルタイム更新中', ko: '실시간 업데이트', ar: 'تحديثات فورية' },
  'overview.autoRefresh': { zh: '每30秒自动刷新', en: 'Auto-refresh every 30s', ja: '30秒ごとに自動更新', ko: '30쒈마다 자동 새로고침', ar: 'تحديث تلقائي كل 30 ثانية' },
  'overview.active': { zh: '当前', en: 'ACTIVE', ja: 'アクティブ', ko: '활성', ar: 'نشط' },

  // === Currency ===
  'currency.cn': { zh: '¥', en: '¥', ja: '¥', ko: '¥', ar: '¥' },
  'currency.hk': { zh: 'HK$', en: 'HK$', ja: 'HK$', ko: 'HK$', ar: 'HK$' },
  'currency.us': { zh: '$', en: '$', ja: '$', ko: '$', ar: '$' },
  'currency.crypto': { zh: '$', en: '$', ja: '$', ko: '$', ar: '$' },

  // === Table Headers ===
  'table.name': { zh: '名称', en: 'Name', ja: '名称', ko: '이름', ar: 'الاسم' },
  'table.code': { zh: '代码', en: 'Code', ja: 'コード', ko: '코드', ar: 'الرمز' },
  'table.industry': { zh: '行业', en: 'Industry', ja: '業種', ko: '업종', ar: 'القطاع' },
  'table.price': { zh: '现价', en: 'Price', ja: '現在値', ko: '현재가', ar: 'السعر' },
  'table.change': { zh: '涨跌', en: 'Change', ja: '変動', ko: '변동', ar: 'التغير' },
  'table.score': { zh: '评分', en: 'Score', ja: 'スコア', ko: '점수', ar: 'الدرجة' },
  'table.signal': { zh: '信号', en: 'Signal', ja: 'シグナル', ko: '신호', ar: 'الإشارة' },
  'table.flow': { zh: '资金流', en: 'Flow', ja: '資金', ko: '자금', ar: 'التدفق' },
  'table.reason': { zh: '理由', en: 'Reason', ja: '理由', ko: '이유', ar: 'السبب' },
  'table.flowUnit': { zh: '亿', en: 'B', ja: '億', ko: '억', ar: 'مليار' },

  // === Footer ===
  'footer.disclaimer': { zh: '数据仅供参考，不构成投资建议', en: 'Data for reference only, not investment advice', ja: 'データは参考用であり、投資助言ではありません', ko: '데이터는 참고용이며 투자 조언이 아닙니다', ar: 'البيانات للمرجعية فقط، وليست نصيحة استثمارية' },

  // === Heatmap ===
  'heatmap.sector': { zh: '板块', en: 'Sector', ja: 'セクター', ko: '섹터', ar: 'القطاع' },
};

// Get translation
export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

// Get localized name from multi-lang object
export function getName(obj: { nameZh?: string; nameEn?: string; nameJa?: string; nameKo?: string; nameAr?: string }, lang: Lang): string {
  switch (lang) {
    case 'zh': return obj.nameZh || obj.nameEn || '';
    case 'ja': return obj.nameJa || obj.nameZh || obj.nameEn || '';
    case 'ko': return obj.nameKo || obj.nameEn || '';
    case 'ar': return obj.nameAr || obj.nameEn || '';
    default: return obj.nameEn || obj.nameZh || '';
  }
}

// Get localized reason
export function getReason(obj: { reasonZh?: string; reasonEn?: string }, lang: Lang): string {
  return lang === 'zh' || lang === 'ja' ? (obj.reasonZh || obj.reasonEn || '') : (obj.reasonEn || obj.reasonZh || '');
}

// Get localized signal text
export function getSignalText(signal: string, lang: Lang): string {
  const key = `signal.${signal}`;
  return t(key, lang);
}

// Is RTL language
export function isRTL(lang: Lang): boolean {
  return lang === 'ar';
}
