import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Wand2, Send, Play, TrendingUp, Users, Zap,
  CheckCircle, Star, Shield, Clock, BarChart3, ArrowRight, Archive,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlatformStore } from '../store/platformStore';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import HomeFullPageCarousel, { type HomeSlide } from '../components/home/HomeFullPageCarousel';
import type { TagLine } from '../components/home/HeroSlideLayout';

// ===== Helpers =====

function useCountUp(target: number, duration = 1600, s = true) {
  const [c, setC] = useState(0);
  useEffect(() => {
    if (!s) return;
    let st: number, raf: number;
    const a = (t: number) => {
      if (!st) st = t;
      const p = Math.min((t - st) / duration, 1);
      setC(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(a);
    };
    raf = requestAnimationFrame(a);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, s]);
  return c;
}

const WORDS = ['微信公众号', '小红书笔记', '微博话题', '抖音图文', '品牌文案'];

function RotatingText() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % WORDS.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-flex items-center min-w-[180px]">
      <AnimatePresence mode="wait">
        <motion.span
          key={WORDS[i]}
          initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(4px)' }}
          transition={{ duration: 0.4 }}
          className="absolute text-gilt-gradient font-extrabold"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
      <span className="invisible font-extrabold">{WORDS[0]}</span>
    </span>
  );
}

function StatItem({ label, value, suffix, icon, inView }: {
  label: string; value: number; suffix?: string; icon: React.ReactNode; inView: boolean;
}) {
  const c = useCountUp(value, 1800, inView);
  return (
    <div className="group text-center p-4 sm:p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/[0.18] hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 text-gilt-300"
        style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))' }}>
        {icon}
      </div>
      <div className="text-2xl sm:text-3xl font-heading font-bold text-white">{c}{suffix || ''}</div>
      <p className="text-xs sm:text-sm text-white/60 mt-1">{label}</p>
    </div>
  );
}

const DEFAULT_TAGS: TagLine[] = [
  { words: ['AI-Powered', 'Smart Publishing', 'Cross-Platform', 'Workflow Automation'], direction: 'right', speed: 50, size: 'xl' },
  { words: ['Content Operations', 'Auto Adaptation', 'Creative AI', 'Brand Growth'], direction: 'left', speed: 55, size: '2xl' },
  { words: ['Copywriting Engine', 'SEO', 'Data Analytics', 'Content Strategy'], direction: 'right', speed: 45, size: 'xl' },
  { words: ['WeChat Ecosystem', 'Social CRM', 'ROI Tracking', 'Campaigns'], direction: 'left', speed: 60, size: '2xl' },
];

const FEATURES = [
  { icon: <Wand2 className="w-5 h-5" />, title: 'AI 内容生成', desc: '自动为微信、小红书、微博、抖音生成风格适配的标题与正文' },
  { icon: <Archive className="w-5 h-5" />, title: '历史记录', desc: '按平台分类保存生成内容与推送日志' },
  { icon: <Send className="w-5 h-5" />, title: '多平台分发', desc: '一键推送至微信草稿箱、小红书编辑器、微博、抖音' },
  { icon: <BarChart3 className="w-5 h-5" />, title: '数据看板', desc: '追踪各平台发布记录与推送状态' },
];

const USE_CASES = [
  { icon: <Star className="w-5 h-5" />, title: '品牌电商', desc: '产品种草文案批量生成，适配不同平台调性' },
  { icon: <Users className="w-5 h-5" />, title: '自媒体矩阵', desc: '一人管理多账号，AI 自动改写适配各平台' },
  { icon: <Shield className="w-5 h-5" />, title: '内容服务商', desc: '标准化流程快速交付多平台代运营内容' },
  { icon: <Zap className="w-5 h-5" />, title: 'AI 辅助创作', desc: '创意枯竭时提供灵感，智能改写脱颖而出' },
];

const STEPS = [
  { step: '01', title: '绑定平台账号', desc: '支持微信公众号、微博、小红书一键接入', icon: <Users className="w-5 h-5" /> },
  { step: '02', title: 'AI 智能改写', desc: '选择目标平台，自动生成风格适配的标题和正文', icon: <Wand2 className="w-5 h-5" /> },
  { step: '03', title: '一键推送草稿箱', desc: '微信进草稿箱，小红书自动填入编辑器', icon: <Send className="w-5 h-5" /> },
];

function FeatureList() {
  return (
    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
      {FEATURES.map((f) => (
        <div key={f.title} className="flex gap-4 p-5 sm:p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/[0.18] hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
          <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-gilt-300"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))' }}>
            {f.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{f.title}</p>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepList() {
  return (
    <div className="space-y-5 sm:space-y-6">
      {STEPS.map((s) => (
        <div key={s.step} className="flex gap-4 p-5 sm:p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm items-start hover:bg-white/10 hover:border-white/[0.18] hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
          <div className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#C8B590,#A08A60)' }}>
            {s.step}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{s.title}</p>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">{s.desc}</p>
          </div>
          <div className="text-gilt-300">{s.icon}</div>
        </div>
      ))}
    </div>
  );
}

function UseCaseList() {
  return (
    <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
      {USE_CASES.map((u) => (
        <div key={u.title} className="flex gap-4 p-5 sm:p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/[0.18] hover:backdrop-blur-md hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] transition-all duration-300">
          <div className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-gilt-300"
            style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))' }}>
            {u.icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{u.title}</p>
            <p className="text-xs text-white/60 mt-2 leading-relaxed">{u.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlatformLinks() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      {PLATFORM_ORDER.map((pid) => {
        const p = PLATFORMS[pid];
        return (
          <Link
            key={pid}
            to={p.apiStatus === 'live' ? `/platforms/${pid}` : '/platforms'}
            className="flex items-center justify-center gap-3 px-6 py-3 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm text-sm font-medium text-white/80 hover:text-white hover:border-gilt-400/40 hover:bg-white/12 transition-all"
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name}
            {p.apiStatus === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-gilt-400" />}
          </Link>
        );
      })}
    </div>
  );
}

// ===== HomePage =====

export default function HomePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { fetchWechatStatus } = usePlatformStore();
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => { if (token) fetchWechatStatus(); }, [token]);
  useEffect(() => {
    const t = setTimeout(() => setStatsInView(true), 500);
    return () => clearTimeout(t);
  }, []);

  const slides: HomeSlide[] = [
    {
      id: 'hero',
      label: '首页',
      badge: 'Altus 奥途智营 · 多平台内容智能运营',
      title: (
        <>
          <span className="block">让 AI 帮你</span>
          <span className="block h-[1.35em] mt-4 sm:mt-5">运营<RotatingText /></span>
        </>
      ),
      subtitle: '输入内容，AI 为微信、小红书、微博、抖音自动生成风格适配的标题和文案，一键推送到各平台草稿箱',
      actions: (
        <>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(token ? '/generate' : '/account')}
            className="btn-gilt inline-flex items-center justify-center gap-3 px-12 py-5 rounded-xl font-bold text-base sm:text-lg">
            <Play className="w-5 h-5" />{token ? '开始创作' : '免费开始创作'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/platforms')}
            className="inline-flex items-center justify-center gap-3 px-12 py-5 rounded-xl font-bold text-base sm:text-lg border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 transition-colors">
            绑定平台账号 <ArrowRight className="w-5 h-5" />
          </motion.button>
        </>
      ),
      extra: <PlatformLinks />,
      tags: DEFAULT_TAGS,
    },
    {
      id: 'brand',
      label: '品牌',
      badge: 'Altus 奥途智营',
      title: <span className="text-gilt-gradient">智启内容新高度</span>,
      subtitle: 'Altus 奥途智营 · 多平台内容智能运营 SaaS，让内容创作与分发更高效',
      tags: [
        { words: ['Brand Growth', 'Content Excellence', 'Smart Operations'], direction: 'right', speed: 48, size: '2xl' },
        { words: ['Digital Marketing', 'Omni-Channel', 'AI Native'], direction: 'left', speed: 52, size: 'xl' },
        { words: ['Altus', '奥途智营', 'Content Intelligence'], direction: 'right', speed: 55, size: '2xl' },
      ],
    },
    {
      id: 'features',
      label: '核心能力',
      badge: 'Core Capabilities',
      title: '四大核心能力',
      subtitle: '从内容生成到多平台分发，AI 覆盖运营全流程',
      extra: <FeatureList />,
      actions: (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/generate')}
          className="btn-gilt inline-flex items-center gap-3 px-12 py-5 rounded-xl font-bold text-base">
          立即体验 <ArrowRight className="w-5 h-5" />
        </motion.button>
      ),
      tags: [
        { words: ['AI Generation', 'Multi-Platform', 'Auto Publish', 'History'], direction: 'right', speed: 50, size: 'xl' },
        { words: ['WeChat', 'Xiaohongshu', 'Weibo', 'Douyin'], direction: 'left', speed: 58, size: '2xl' },
        { words: ['Draft Box', 'One-Click Push', 'Analytics'], direction: 'right', speed: 45, size: 'lg' },
      ],
    },
    {
      id: 'stats',
      label: '数据亮点',
      badge: 'Highlights',
      title: '运营效率一目了然',
      subtitle: '更少步骤，更快触达多平台受众',
      extra: (
        <div className="grid grid-cols-2 gap-5 sm:gap-6">
          <StatItem label="支持平台" value={4} icon={<TrendingUp className="w-5 h-5" />} inView={statsInView} />
          <StatItem label="AI 改写风格" value={4} icon={<Sparkles className="w-5 h-5" />} inView={statsInView} />
          <StatItem label="操作步骤" value={3} icon={<Zap className="w-5 h-5" />} inView={statsInView} />
          <StatItem label="分钟发布" value={5} suffix="min" icon={<Clock className="w-5 h-5" />} inView={statsInView} />
        </div>
      ),
      tags: [
        { words: ['4 Platforms', '3 Steps', '5 Min Publish'], direction: 'right', speed: 50, size: '2xl' },
        { words: ['Efficiency', 'Automation', 'Scale'], direction: 'left', speed: 55, size: 'xl' },
      ],
    },
    {
      id: 'workflow',
      label: '使用流程',
      badge: 'How It Works',
      title: '三步完成发布',
      subtitle: '从账号绑定到内容推送，前所未有的简单',
      extra: <StepList />,
      actions: (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/platforms')}
          className="inline-flex items-center gap-3 px-12 py-5 rounded-xl font-bold text-base border border-white/20 bg-white/10 text-white backdrop-blur-md hover:bg-white/15 transition-colors">
          去绑定账号 <ArrowRight className="w-5 h-5" />
        </motion.button>
      ),
      tags: [
        { words: ['Bind Account', 'AI Rewrite', 'Push Draft'], direction: 'right', speed: 48, size: 'xl' },
        { words: ['Step 01', 'Step 02', 'Step 03'], direction: 'left', speed: 60, size: '2xl' },
      ],
    },
    {
      id: 'use-cases',
      label: '适用场景',
      badge: 'Use Cases',
      title: '找到你的运营方式',
      subtitle: '无论你是个人创作者还是团队运营，都能高效产出多平台内容',
      extra: <UseCaseList />,
      tags: [
        { words: ['E-Commerce', 'Creator Matrix', 'Agency', 'AI Assist'], direction: 'right', speed: 50, size: 'xl' },
        { words: ['Brand', 'Influencer', 'Service', 'Creative'], direction: 'left', speed: 55, size: '2xl' },
      ],
    },
    {
      id: 'cta',
      label: '立即开始',
      badge: 'Get Started',
      title: '准备好提升运营效率了吗？',
      subtitle: <span>免费开始，用 AI 驱动你的多平台内容运营<br/>Are you ready？</span>,
      actions: (
        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate(token ? '/generate' : '/account')}
          className="inline-flex items-center gap-3 px-12 py-5 rounded-xl bg-white text-gilt-700 font-bold text-lg hover:bg-crystal-50 transition-colors shadow-lg">
          <Sparkles className="w-5 h-5" />免费开始创作
        </motion.button>
      ),
      tags: [
        { words: ['Start Free', 'Create Now', 'Go Altus'], direction: 'right', speed: 45, size: '2xl' },
        { words: ['Generate', 'Publish', 'Grow'], direction: 'left', speed: 52, size: 'xl' },
      ],
    },
  ];

  return <HomeFullPageCarousel slides={slides} />;
}
