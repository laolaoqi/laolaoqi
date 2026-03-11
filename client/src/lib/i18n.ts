// ===================================================================
// 猎手阿尔法 — i18n 多语言系统
// 支持：中文(zh) / 英语(en) / 日语(ja) / 韩语(ko) / 阿拉伯语(ar)
//       葡萄牙语(pt) / 西班牙语(es) / 泰语(th) / 马来西亚语(ms)
// ===================================================================

export type Lang = 'zh' | 'en' | 'ja' | 'ko' | 'ar' | 'pt' | 'es' | 'th' | 'ms';

export const LANGS: { id: Lang; label: string; flag: string; dir: 'ltr' | 'rtl' }[] = [
  { id: 'zh', label: '中文', flag: '🇨🇳', dir: 'ltr' },
  { id: 'en', label: 'English', flag: '🇺🇸', dir: 'ltr' },
  { id: 'ja', label: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { id: 'ko', label: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { id: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { id: 'pt', label: 'Português', flag: '🇧🇷', dir: 'ltr' },
  { id: 'es', label: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { id: 'th', label: 'ไทย', flag: '🇹🇭', dir: 'ltr' },
  { id: 'ms', label: 'Melayu', flag: '🇲🇾', dir: 'ltr' },
];

// Translation dictionary
const translations: Record<string, Record<Lang, string>> = {
  // === Brand ===
  'brand.name': { zh: '猎手阿尔法', en: 'HUNTER ALPHA', ja: 'ハンターアルファ', ko: '헌터 알파', ar: 'هنتر ألفا', pt: 'HUNTER ALPHA', es: 'HUNTER ALPHA', th: 'ฮันเตอร์ อัลฟ่า', ms: 'HUNTER ALPHA' },
  'brand.subtitle': { zh: '战术指挥中心', en: 'Tactical Command Center', ja: '戦術指揮センター', ko: '전술 지휘 센터', ar: 'مركز القيادة التكتيكية', pt: 'Centro de Comando Tático', es: 'Centro de Mando Táctico', th: 'ศูนย์บัญชาการยุทธวิธี', ms: 'Pusat Arahan Taktikal' },
  'brand.version': { zh: 'HUNTER ALPHA v2.0 — 战术指挥中心', en: 'HUNTER ALPHA v2.0 — Tactical Command Center', ja: 'HUNTER ALPHA v2.0 — 戦術指揮センター', ko: 'HUNTER ALPHA v2.0 — 전술 지휘 센터', ar: 'HUNTER ALPHA v2.0 — مركز القيادة التكتيكية', pt: 'HUNTER ALPHA v2.0 — Centro de Comando Tático', es: 'HUNTER ALPHA v2.0 — Centro de Mando Táctico', th: 'HUNTER ALPHA v2.0 — ศูนย์บัญชาการยุทธวิธี', ms: 'HUNTER ALPHA v2.0 — Pusat Arahan Taktikal' },
  'brand.disclaimer': { zh: '数据仅供参考，不构成投资建议', en: 'Data for reference only, not investment advice', ja: 'データは参考用であり、投資助言ではありません', ko: '데이터는 참고용이며 투자 조언이 아닙니다', ar: 'البيانات للمرجعية فقط، وليست نصيحة استثمارية', pt: 'Dados apenas para referência, não constituem aconselhamento de investimento', es: 'Datos solo como referencia, no constituyen asesoramiento de inversión', th: 'ข้อมูลเพื่อการอ้างอิงเท่านั้น ไม่ถือเป็นคำแนะนำการลงทุน', ms: 'Data untuk rujukan sahaja, bukan nasihat pelaburan' },

  // === TopBar ===
  'topbar.live': { zh: '实时数据', en: 'LIVE DATA', ja: 'リアルタイム', ko: '실시간', ar: 'بيانات حية', pt: 'DADOS AO VIVO', es: 'DATOS EN VIVO', th: 'ข้อมูลสด', ms: 'DATA LANGSUNG' },
  'topbar.mock': { zh: '模拟数据', en: 'MOCK DATA', ja: 'モック', ko: '모의 데이터', ar: 'بيانات تجريبية', pt: 'DADOS SIMULADOS', es: 'DATOS SIMULADOS', th: 'ข้อมูลจำลอง', ms: 'DATA SIMULASI' },
  'topbar.updated': { zh: '更新于', en: 'Updated', ja: '更新', ko: '업데이트', ar: 'تحديث', pt: 'Atualizado', es: 'Actualizado', th: 'อัปเดต', ms: 'Dikemas kini' },
  'topbar.refresh': { zh: '刷新数据', en: 'Refresh', ja: '更新', ko: '새로고침', ar: 'تحديث', pt: 'Atualizar', es: 'Actualizar', th: 'รีเฟรช', ms: 'Muat semula' },
  'topbar.login': { zh: '登录', en: 'Login', ja: 'ログイン', ko: '로그인', ar: 'تسجيل الدخول', pt: 'Entrar', es: 'Iniciar sesión', th: 'เข้าสู่ระบบ', ms: 'Log masuk' },
  'topbar.logout': { zh: '退出', en: 'Logout', ja: 'ログアウト', ko: '로그아웃', ar: 'تسجيل الخروج', pt: 'Sair', es: 'Cerrar sesión', th: 'ออกจากระบบ', ms: 'Log keluar' },
  'topbar.guest': { zh: '游客', en: 'Guest', ja: 'ゲスト', ko: '게스트', ar: 'زائر', pt: 'Visitante', es: 'Invitado', th: 'ผู้เยี่ยมชม', ms: 'Tetamu' },

  // === Markets ===
  'market.cn': { zh: 'A股', en: 'A-Share', ja: 'A株', ko: 'A주', ar: 'أسهم A', pt: 'Ações A', es: 'Acciones A', th: 'หุ้น A', ms: 'Saham A' },
  'market.hk': { zh: 'H股', en: 'HK Stock', ja: '香港株', ko: '홍콩주', ar: 'أسهم هونغ كونغ', pt: 'Ações HK', es: 'Acciones HK', th: 'หุ้นฮ่องกง', ms: 'Saham HK' },
  'market.us': { zh: '美股', en: 'US Stock', ja: '米国株', ko: '미국주', ar: 'أسهم أمريكية', pt: 'Ações EUA', es: 'Acciones EE.UU.', th: 'หุ้นสหรัฐ', ms: 'Saham AS' },
  'market.crypto': { zh: '数字货币', en: 'Crypto', ja: '暗号資産', ko: '암호화폐', ar: 'عملات رقمية', pt: 'Cripto', es: 'Cripto', th: 'คริปโต', ms: 'Kripto' },

  // === Trading Status ===
  'status.trading': { zh: '交易中', en: 'TRADING', ja: '取引中', ko: '거래중', ar: 'تداول', pt: 'NEGOCIANDO', es: 'OPERANDO', th: 'ซื้อขาย', ms: 'BERDAGANG' },
  'status.closed': { zh: '已收盘', en: 'CLOSED', ja: '閉場', ko: '마감', ar: 'مغلق', pt: 'FECHADO', es: 'CERRADO', th: 'ปิดตลาด', ms: 'DITUTUP' },
  'status.premarket': { zh: '盘前', en: 'PRE-MKT', ja: 'プレ', ko: '장전', ar: 'قبل السوق', pt: 'PRÉ-MKT', es: 'PRE-MKT', th: 'ก่อนตลาด', ms: 'PRA-MKT' },
  'status.afterhours': { zh: '盘后', en: 'AFTER-HRS', ja: 'アフター', ko: '장후', ar: 'بعد السوق', pt: 'PÓS-HRS', es: 'POST-HRS', th: 'หลังตลาด', ms: 'LEPAS-JAM' },
  'status.lunchbreak': { zh: '午休', en: 'LUNCH', ja: '昼休み', ko: '점심', ar: 'استراحة', pt: 'ALMOÇO', es: 'ALMUERZO', th: 'พักกลางวัน', ms: 'REHAT' },
  'status.24h': { zh: '24H交易', en: '24H TRADING', ja: '24H取引', ko: '24H거래', ar: 'تداول 24 ساعة', pt: 'NEGOCIAÇÃO 24H', es: 'OPERACIÓN 24H', th: 'ซื้อขาย 24 ชม.', ms: 'DAGANGAN 24J' },

  // === Panels ===
  'panel.modeScores': { zh: '模式评分', en: 'MODE SCORES', ja: 'モードスコア', ko: '모드 점수', ar: 'درجات الوضع', pt: 'PONTUAÇÃO', es: 'PUNTUACIÓN', th: 'คะแนนโหมด', ms: 'SKOR MOD' },
  'panel.marketScan': { zh: '市场全景扫描', en: 'MARKET PANORAMA', ja: 'マーケットパノラマ', ko: '시장 파노라마', ar: 'بانوراما السوق', pt: 'PANORAMA DO MERCADO', es: 'PANORAMA DEL MERCADO', th: 'ภาพรวมตลาด', ms: 'PANORAMA PASARAN' },
  'panel.tradingClock': { zh: '全球交易时钟', en: 'GLOBAL TRADING CLOCK', ja: 'グローバル取引時計', ko: '글로벌 거래 시계', ar: 'ساعة التداول العالمية', pt: 'RELÓGIO GLOBAL', es: 'RELOJ GLOBAL', th: 'นาฬิกาซื้อขายโลก', ms: 'JAM DAGANGAN GLOBAL' },
  'panel.weight': { zh: '动态权重分配', en: 'DYNAMIC WEIGHTS', ja: '動的ウェイト', ko: '동적 가중치', ar: 'الأوزان الديناميكية', pt: 'PESOS DINÂMICOS', es: 'PESOS DINÁMICOS', th: 'น้ำหนักไดนามิก', ms: 'BERAT DINAMIK' },
  'panel.sentiment': { zh: '市场情绪指标', en: 'MARKET SENTIMENT', ja: '市場センチメント', ko: '시장 심리', ar: 'معنويات السوق', pt: 'SENTIMENTO DO MERCADO', es: 'SENTIMIENTO DEL MERCADO', th: 'ความเชื่อมั่นตลาด', ms: 'SENTIMEN PASARAN' },
  'panel.news': { zh: '舆情摘要', en: 'NEWS DIGEST', ja: 'ニュースダイジェスト', ko: '뉴스 요약', ar: 'ملخص الأخبار', pt: 'RESUMO DE NOTÍCIAS', es: 'RESUMEN DE NOTICIAS', th: 'สรุปข่าว', ms: 'RINGKASAN BERITA' },
  'panel.topRec': { zh: '核心推荐 TOP 10', en: 'TOP 10 PICKS', ja: 'TOP 10 推奨', ko: 'TOP 10 추천', ar: 'أفضل 10 اختيارات', pt: 'TOP 10 SELEÇÕES', es: 'TOP 10 SELECCIONES', th: 'TOP 10 คัดสรร', ms: 'TOP 10 PILIHAN' },
  'panel.riskControl': { zh: '风控与交易计划', en: 'RISK CONTROL', ja: 'リスク管理', ko: '리스크 관리', ar: 'إدارة المخاطر', pt: 'CONTROLE DE RISCO', es: 'CONTROL DE RIESGO', th: 'ควบคุมความเสี่ยง', ms: 'KAWALAN RISIKO' },
  'panel.fearGreed': { zh: '恐惧贪婪指数', en: 'FEAR & GREED INDEX', ja: '恐怖と貪欲指数', ko: '공포 탐욕 지수', ar: 'مؤشر الخوف والطمع', pt: 'ÍNDICE MEDO & GANÂNCIA', es: 'ÍNDICE MIEDO & CODICIA', th: 'ดัชนีความกลัวและความโลภ', ms: 'INDEKS TAKUT & TAMAK' },
  'panel.heatmap': { zh: '市场热力图', en: 'MARKET HEATMAP', ja: 'マーケットヒートマップ', ko: '시장 히트맵', ar: 'خريطة حرارية', pt: 'MAPA DE CALOR', es: 'MAPA DE CALOR', th: 'แผนที่ความร้อนตลาด', ms: 'PETA HABA PASARAN' },

  // === Mode Scores ===
  'mode.dominant': { zh: '当前建议投资模式', en: 'RECOMMENDED MODE', ja: '推奨投資モード', ko: '추천 투자 모드', ar: 'وضع الاستثمار الموصى به', pt: 'MODO RECOMENDADO', es: 'MODO RECOMENDADO', th: 'โหมดแนะนำ', ms: 'MOD DISYORKAN' },
  'mode.attack': { zh: '进攻模式', en: 'ATTACK', ja: '攻撃モード', ko: '공격 모드', ar: 'وضع الهجوم', pt: 'ATAQUE', es: 'ATAQUE', th: 'โจมตี', ms: 'SERANGAN' },
  'mode.defense': { zh: '防御模式', en: 'DEFENSE', ja: '防御モード', ko: '방어 모드', ar: 'وضع الدفاع', pt: 'DEFESA', es: 'DEFENSA', th: 'ป้องกัน', ms: 'PERTAHANAN' },
  'mode.oscillation': { zh: '震荡模式', en: 'OSCILLATION', ja: '振動モード', ko: '진동 모드', ar: 'وضع التذبذب', pt: 'OSCILAÇÃO', es: 'OSCILACIÓN', th: 'สั่นสะเทือน', ms: 'AYUNAN' },
  'mode.attackLabel': { zh: '进攻', en: 'Attack', ja: '攻撃', ko: '공격', ar: 'هجوم', pt: 'Ataque', es: 'Ataque', th: 'โจมตี', ms: 'Serangan' },
  'mode.defenseLabel': { zh: '防御', en: 'Defense', ja: '防御', ko: '방어', ar: 'دفاع', pt: 'Defesa', es: 'Defensa', th: 'ป้องกัน', ms: 'Pertahanan' },
  'mode.oscillationLabel': { zh: '震荡', en: 'Oscillation', ja: '振動', ko: '진동', ar: 'تذبذب', pt: 'Oscilação', es: 'Oscilación', th: 'สั่นสะเทือน', ms: 'Ayunan' },
  'mode.score': { zh: '分', en: 'pts', ja: '点', ko: '점', ar: 'نقطة', pt: 'pts', es: 'pts', th: 'คะแนน', ms: 'mata' },

  // === Weights ===
  'weight.fundamental': { zh: '基本面', en: 'Fundamental', ja: 'ファンダメンタル', ko: '펀더멘털', ar: 'أساسي', pt: 'Fundamental', es: 'Fundamental', th: 'ปัจจัยพื้นฐาน', ms: 'Fundamental' },
  'weight.capitalFlow': { zh: '资金流', en: 'Capital Flow', ja: '資金フロー', ko: '자금 흐름', ar: 'تدفق رأس المال', pt: 'Fluxo de Capital', es: 'Flujo de Capital', th: 'กระแสเงินทุน', ms: 'Aliran Modal' },
  'weight.technical': { zh: '技术量', en: 'Technical', ja: 'テクニカル', ko: '기술적', ar: 'تقني', pt: 'Técnico', es: 'Técnico', th: 'เทคนิค', ms: 'Teknikal' },
  'weight.autoAdjust': { zh: '权重根据市场模式自动调整', en: 'Weights auto-adjust by market mode', ja: 'ウェイトは市場モードに応じて自動調整', ko: '가중치는 시장 모드에 따라 자동 조정', ar: 'الأوزان تتكيف تلقائياً مع وضع السوق', pt: 'Pesos ajustam-se automaticamente pelo modo de mercado', es: 'Los pesos se ajustan automáticamente según el modo del mercado', th: 'น้ำหนักปรับอัตโนมัติตามโหมดตลาด', ms: 'Berat disesuaikan secara automatik mengikut mod pasaran' },

  // === Sentiment ===
  'sentiment.risefall': { zh: '涨跌比', en: 'Rise/Fall Ratio', ja: '騰落比', ko: '등락비', ar: 'نسبة الصعود/الهبوط', pt: 'Razão Alta/Baixa', es: 'Ratio Subida/Bajada', th: 'อัตราส่วนขึ้น/ลง', ms: 'Nisbah Naik/Turun' },
  'sentiment.rise': { zh: '涨', en: 'Rise', ja: '上昇', ko: '상승', ar: 'صعود', pt: 'Alta', es: 'Subida', th: 'ขึ้น', ms: 'Naik' },
  'sentiment.flat': { zh: '平', en: 'Flat', ja: '横ばい', ko: '보합', ar: 'مستقر', pt: 'Estável', es: 'Estable', th: 'ทรงตัว', ms: 'Mendatar' },
  'sentiment.fall': { zh: '跌', en: 'Fall', ja: '下落', ko: '하락', ar: 'هبوط', pt: 'Baixa', es: 'Bajada', th: 'ลง', ms: 'Turun' },
  'sentiment.limitUp': { zh: '涨停', en: 'Limit Up', ja: 'ストップ高', ko: '상한가', ar: 'الحد الأعلى', pt: 'Limite Alta', es: 'Límite Subida', th: 'ขึ้นเพดาน', ms: 'Had Naik' },
  'sentiment.limitDown': { zh: '跌停', en: 'Limit Down', ja: 'ストップ安', ko: '하한가', ar: 'الحد الأدنى', pt: 'Limite Baixa', es: 'Límite Bajada', th: 'ลงเพดาน', ms: 'Had Turun' },

  // === News Digest ===
  'news.mainTone': { zh: '主基调', en: 'Main Tone', ja: '基調', ko: '기조', ar: 'النغمة الرئيسية', pt: 'Tom Principal', es: 'Tono Principal', th: 'โทนหลัก', ms: 'Nada Utama' },
  'news.capitalTrend': { zh: '资金动向', en: 'Capital Trend', ja: '資金動向', ko: '자금 동향', ar: 'اتجاه رأس المال', pt: 'Tendência de Capital', es: 'Tendencia de Capital', th: 'แนวโน้มเงินทุน', ms: 'Trend Modal' },
  'news.strategy': { zh: '策略建议', en: 'Strategy', ja: '戦略提案', ko: '전략 제안', ar: 'اقتراح الاستراتيجية', pt: 'Estratégia', es: 'Estrategia', th: 'กลยุทธ์', ms: 'Strategi' },

  // === Recommendations Table ===
  'rec.rank': { zh: '#', en: '#', ja: '#', ko: '#', ar: '#', pt: '#', es: '#', th: '#', ms: '#' },
  'rec.name': { zh: '名称', en: 'Name', ja: '名称', ko: '이름', ar: 'الاسم', pt: 'Nome', es: 'Nombre', th: 'ชื่อ', ms: 'Nama' },
  'rec.code': { zh: '代码', en: 'Code', ja: 'コード', ko: '코드', ar: 'الرمز', pt: 'Código', es: 'Código', th: 'รหัส', ms: 'Kod' },
  'rec.industry': { zh: '行业', en: 'Industry', ja: '業種', ko: '업종', ar: 'القطاع', pt: 'Setor', es: 'Sector', th: 'อุตสาหกรรม', ms: 'Industri' },
  'rec.price': { zh: '现价', en: 'Price', ja: '現在値', ko: '현재가', ar: 'السعر', pt: 'Preço', es: 'Precio', th: 'ราคา', ms: 'Harga' },
  'rec.change': { zh: '涨跌', en: 'Change', ja: '変動', ko: '변동', ar: 'التغير', pt: 'Variação', es: 'Cambio', th: 'เปลี่ยนแปลง', ms: 'Perubahan' },
  'rec.score': { zh: '评分', en: 'Score', ja: 'スコア', ko: '점수', ar: 'الدرجة', pt: 'Pontuação', es: 'Puntuación', th: 'คะแนน', ms: 'Skor' },
  'rec.signal': { zh: '信号', en: 'Signal', ja: 'シグナル', ko: '신호', ar: 'الإشارة', pt: 'Sinal', es: 'Señal', th: 'สัญญาณ', ms: 'Isyarat' },
  'rec.flow': { zh: '资金流', en: 'Flow', ja: '資金', ko: '자금', ar: 'التدفق', pt: 'Fluxo', es: 'Flujo', th: 'กระแสเงิน', ms: 'Aliran' },
  'rec.reason': { zh: '理由', en: 'Reason', ja: '理由', ko: '이유', ar: 'السبب', pt: 'Razão', es: 'Razón', th: 'เหตุผล', ms: 'Sebab' },
  'rec.nextUpdate': { zh: '下次更新', en: 'Next update', ja: '次回更新', ko: '다음 업데이트', ar: 'التحديث التالي', pt: 'Próxima atualização', es: 'Próxima actualización', th: 'อัปเดตถัดไป', ms: 'Kemas kini seterusnya' },

  // === Signals ===
  'signal.buy': { zh: '买入', en: 'BUY', ja: '買い', ko: '매수', ar: 'شراء', pt: 'COMPRAR', es: 'COMPRAR', th: 'ซื้อ', ms: 'BELI' },
  'signal.add': { zh: '增持', en: 'ADD', ja: '追加', ko: '추가', ar: 'إضافة', pt: 'ADICIONAR', es: 'AÑADIR', th: 'เพิ่ม', ms: 'TAMBAH' },
  'signal.hold': { zh: '观望', en: 'HOLD', ja: '様子見', ko: '관망', ar: 'انتظار', pt: 'MANTER', es: 'MANTENER', th: 'ถือ', ms: 'PEGANG' },
  'signal.reduce': { zh: '减持', en: 'REDUCE', ja: '減少', ko: '축소', ar: 'تقليل', pt: 'REDUZIR', es: 'REDUCIR', th: 'ลด', ms: 'KURANG' },

  // === Risk Control ===
  'risk.stopLoss': { zh: '止损策略', en: 'Stop Loss', ja: 'ストップロス', ko: '손절', ar: 'وقف الخسارة', pt: 'Stop Loss', es: 'Stop Loss', th: 'ตัดขาดทุน', ms: 'Henti Rugi' },
  'risk.takeProfit': { zh: '止盈策略', en: 'Take Profit', ja: '利確', ko: '익절', ar: 'جني الأرباح', pt: 'Take Profit', es: 'Take Profit', th: 'ทำกำไร', ms: 'Ambil Untung' },
  'risk.position': { zh: '仓位建议', en: 'Position', ja: 'ポジション', ko: '포지션', ar: 'المركز', pt: 'Posição', es: 'Posición', th: 'ตำแหน่ง', ms: 'Posisi' },
  'risk.current': { zh: '当前建议', en: 'Current', ja: '現在', ko: '현재', ar: 'الحالي', pt: 'Atual', es: 'Actual', th: 'ปัจจุบัน', ms: 'Semasa' },
  'risk.bull': { zh: '牛市仓位', en: 'Bull Market', ja: '強気相場', ko: '강세장', ar: 'سوق صاعد', pt: 'Mercado em Alta', es: 'Mercado Alcista', th: 'ตลาดกระทิง', ms: 'Pasaran Menaik' },
  'risk.bear': { zh: '熊市仓位', en: 'Bear Market', ja: '弱気相場', ko: '약세장', ar: 'سوق هابط', pt: 'Mercado em Baixa', es: 'Mercado Bajista', th: 'ตลาดหมี', ms: 'Pasaran Menurun' },
  'risk.hardStop': { zh: '硬止损线', en: 'Hard Stop Line', ja: 'ハードストップ', ko: '하드 스톱', ar: 'خط وقف صارم', pt: 'Linha de Stop Rígida', es: 'Línea de Stop Rígida', th: 'เส้นหยุดขาดทุนแข็ง', ms: 'Garisan Henti Keras' },
  'risk.strictExec': { zh: '严格执行，不留侥幸', en: 'Execute strictly, no exceptions', ja: '厳格に実行', ko: '엄격히 실행', ar: 'تنفيذ صارم', pt: 'Executar rigorosamente, sem exceções', es: 'Ejecutar estrictamente, sin excepciones', th: 'ดำเนินการอย่างเคร่งครัด ไม่มีข้อยกเว้น', ms: 'Laksanakan dengan tegas, tiada pengecualian' },
  'risk.batchProfit': { zh: '分批止盈，锁定利润', en: 'Scale out, lock in profits', ja: '段階的に利確', ko: '분할 익절', ar: 'جني تدريجي', pt: 'Saída gradual, garantir lucros', es: 'Salida gradual, asegurar ganancias', th: 'ทยอยทำกำไร ล็อกกำไร', ms: 'Keluar berperingkat, kunci keuntungan' },
  'risk.dynamicAdjust': { zh: '根据市场模式动态调整', en: 'Adjust dynamically by market mode', ja: '市場モードに応じて調整', ko: '시장 모드에 따라 조정', ar: 'تعديل ديناميكي', pt: 'Ajustar dinamicamente pelo modo de mercado', es: 'Ajustar dinámicamente según el modo del mercado', th: 'ปรับแบบไดนามิกตามโหมดตลาด', ms: 'Sesuaikan secara dinamik mengikut mod pasaran' },

  // === Fear & Greed ===
  'fg.extremeFear': { zh: '极度恐惧', en: 'Extreme Fear', ja: '極度の恐怖', ko: '극도의 공포', ar: 'خوف شديد', pt: 'Medo Extremo', es: 'Miedo Extremo', th: 'กลัวสุดขีด', ms: 'Takut Melampau' },
  'fg.fear': { zh: '恐惧', en: 'Fear', ja: '恐怖', ko: '공포', ar: 'خوف', pt: 'Medo', es: 'Miedo', th: 'กลัว', ms: 'Takut' },
  'fg.neutral': { zh: '中性', en: 'Neutral', ja: '中立', ko: '중립', ar: 'محايد', pt: 'Neutro', es: 'Neutral', th: 'เป็นกลาง', ms: 'Neutral' },
  'fg.greed': { zh: '贪婪', en: 'Greed', ja: '貪欲', ko: '탐욕', ar: 'طمع', pt: 'Ganância', es: 'Codicia', th: 'โลภ', ms: 'Tamak' },
  'fg.extremeGreed': { zh: '极度贪婪', en: 'Extreme Greed', ja: '極度の貪欲', ko: '극도의 탐욕', ar: 'طمع شديد', pt: 'Ganância Extrema', es: 'Codicia Extrema', th: 'โลภสุดขีด', ms: 'Tamak Melampau' },

  // === Market Overview ===
  'overview.realtime': { zh: '实时更新中', en: 'Real-time updates', ja: 'リアルタイム更新中', ko: '실시간 업데이트', ar: 'تحديثات فورية', pt: 'Atualizações em tempo real', es: 'Actualizaciones en tiempo real', th: 'อัปเดตแบบเรียลไทม์', ms: 'Kemas kini masa nyata' },
  'overview.autoRefresh': { zh: '每30秒自动刷新', en: 'Auto-refresh every 30s', ja: '30秒ごとに自動更新', ko: '30쒈마다 자동 새로고침', ar: 'تحديث تلقائي كل 30 ثانية', pt: 'Atualização automática a cada 30s', es: 'Actualización automática cada 30s', th: 'รีเฟรชอัตโนมัติทุก 30 วินาที', ms: 'Muat semula automatik setiap 30s' },
  'overview.active': { zh: '当前', en: 'ACTIVE', ja: 'アクティブ', ko: '활성', ar: 'نشط', pt: 'ATIVO', es: 'ACTIVO', th: 'ใช้งาน', ms: 'AKTIF' },

  // === Currency ===
  'currency.cn': { zh: '¥', en: '¥', ja: '¥', ko: '¥', ar: '¥', pt: '¥', es: '¥', th: '¥', ms: '¥' },
  'currency.hk': { zh: 'HK$', en: 'HK$', ja: 'HK$', ko: 'HK$', ar: 'HK$', pt: 'HK$', es: 'HK$', th: 'HK$', ms: 'HK$' },
  'currency.us': { zh: '$', en: '$', ja: '$', ko: '$', ar: '$', pt: '$', es: '$', th: '$', ms: '$' },
  'currency.crypto': { zh: '$', en: '$', ja: '$', ko: '$', ar: '$', pt: '$', es: '$', th: '$', ms: '$' },

  // === Table Headers ===
  'table.name': { zh: '名称', en: 'Name', ja: '名称', ko: '이름', ar: 'الاسم', pt: 'Nome', es: 'Nombre', th: 'ชื่อ', ms: 'Nama' },
  'table.code': { zh: '代码', en: 'Code', ja: 'コード', ko: '코드', ar: 'الرمز', pt: 'Código', es: 'Código', th: 'รหัส', ms: 'Kod' },
  'table.industry': { zh: '行业', en: 'Industry', ja: '業種', ko: '업종', ar: 'القطاع', pt: 'Setor', es: 'Sector', th: 'อุตสาหกรรม', ms: 'Industri' },
  'table.price': { zh: '现价', en: 'Price', ja: '現在値', ko: '현재가', ar: 'السعر', pt: 'Preço', es: 'Precio', th: 'ราคา', ms: 'Harga' },
  'table.change': { zh: '涨跌', en: 'Change', ja: '変動', ko: '변동', ar: 'التغير', pt: 'Variação', es: 'Cambio', th: 'เปลี่ยนแปลง', ms: 'Perubahan' },
  'table.score': { zh: '评分', en: 'Score', ja: 'スコア', ko: '점수', ar: 'الدرجة', pt: 'Pontuação', es: 'Puntuación', th: 'คะแนน', ms: 'Skor' },
  'table.signal': { zh: '信号', en: 'Signal', ja: 'シグナル', ko: '신호', ar: 'الإشارة', pt: 'Sinal', es: 'Señal', th: 'สัญญาณ', ms: 'Isyarat' },
  'table.flow': { zh: '资金流', en: 'Flow', ja: '資金', ko: '자금', ar: 'التدفق', pt: 'Fluxo', es: 'Flujo', th: 'กระแสเงิน', ms: 'Aliran' },
  'table.reason': { zh: '理由', en: 'Reason', ja: '理由', ko: '이유', ar: 'السبب', pt: 'Razão', es: 'Razón', th: 'เหตุผล', ms: 'Sebab' },
  'table.flowUnit': { zh: '亿', en: 'B', ja: '億', ko: '억', ar: 'مليار', pt: 'B', es: 'B', th: 'พันล้าน', ms: 'B' },

  // === Footer ===
  'footer.disclaimer': { zh: '数据仅供参考，不构成投资建议', en: 'Data for reference only, not investment advice', ja: 'データは参考用であり、投資助言ではありません', ko: '데이터는 참고용이며 투자 조언이 아닙니다', ar: 'البيانات للمرجعية فقط، وليست نصيحة استثمارية', pt: 'Dados apenas para referência, não constituem aconselhamento de investimento', es: 'Datos solo como referencia, no constituyen asesoramiento de inversión', th: 'ข้อมูลเพื่อการอ้างอิงเท่านั้น ไม่ถือเป็นคำแนะนำการลงทุน', ms: 'Data untuk rujukan sahaja, bukan nasihat pelaburan' },

  // === Heatmap ===
  'heatmap.sector': { zh: '板块', en: 'Sector', ja: 'セクター', ko: '섹터', ar: 'القطاع', pt: 'Setor', es: 'Sector', th: 'เซกเตอร์', ms: 'Sektor' },

  // === AI Summary ===
  'panel.aiSummary': { zh: 'AI 智能市场摘要', en: 'AI MARKET SUMMARY', ja: 'AI マーケットサマリー', ko: 'AI 시장 요약', ar: 'ملخص السوق بالذكاء الاصطناعي', pt: 'RESUMO DE MERCADO IA', es: 'RESUMEN DE MERCADO IA', th: 'สรุปตลาด AI', ms: 'RINGKASAN PASARAN AI' },
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
