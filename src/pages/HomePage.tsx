import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Wand2, Image, Send, Play, TrendingUp, Users, Zap,
  CheckCircle, Star, Shield, Clock, BarChart3, ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { usePlatformStore } from '../store/platformStore';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import FunParticleField from '../components/home/FunParticleField';

// ===== Helpers =====
function useCountUp(target: number, duration = 1600, s = true) {
  const [c, setC] = useState(0);
  useEffect(() => { if(!s) return; let st: number, raf: number;
    const a = (t: number) => { if(!st) st=t; const p=Math.min((t-st)/duration,1); setC(Math.floor((1-Math.pow(1-p,3))*target)); if(p<1) raf=requestAnimationFrame(a); };
    raf=requestAnimationFrame(a); return ()=>cancelAnimationFrame(raf); }, [target,duration,s]);
  return c;
}

const WORDS = ['微信公众号', '小红书笔记', '微博话题', '品牌文案', '营销内容'];
function RotatingText() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(x=>(x+1)%WORDS.length), 2500); return ()=>clearInterval(t); }, []);
  return (<span className="relative inline-flex items-center min-w-[180px]">
    <AnimatePresence mode="wait"><motion.span key={WORDS[i]} initial={{opacity:0,y:20,filter:'blur(4px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} exit={{opacity:0,y:-20,filter:'blur(4px)'}} transition={{duration:0.4}} className="absolute text-gilt-gradient font-extrabold">{WORDS[i]}</motion.span></AnimatePresence>
    <span className="invisible font-extrabold">{WORDS[0]}</span></span>);
}

function StatCard({ label, value, suffix, icon, inView }: { label: string; value: number; suffix?: string; icon: React.ReactNode; inView: boolean }) {
  const c = useCountUp(value, 1800, inView);
  return (<div className="text-center p-8">
    <div className="inline-flex items-center justify-center w-13 h-13 rounded-xl mb-4"
      style={{background:'linear-gradient(135deg,rgba(212,191,138,0.18),rgba(212,191,138,0.05))',boxShadow:'0 2px 6px rgba(30,27,22,0.03),inset 0 1px 0 rgba(255,255,255,0.5)'}}>
      {icon}</div>
    <div className="text-4xl font-heading font-bold mb-1.5 font-mono tracking-tight"
      style={{background:'linear-gradient(180deg,#3D3831 0%,#5C564C 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
      {c}{suffix||''}</div>
    <p className="text-sm font-medium" style={{color:'#8A8276'}}>{label}</p>
  </div>);
}

// ===== Data =====
const FEATURES = [
  { icon: <Wand2 className="w-7 h-7" />, title: 'AI 内容生成', desc: '输入原文，AI 自动为微信、小红书、微博生成风格适配的标题与正文',
    preview: <div className="mt-5 p-4 rounded-xl bg-crystal-50 border border-crystal-200"><div className="flex gap-1.5 mb-2.5"><span className="text-[11px] px-2.5 py-0.5 rounded-full bg-wechat/10 text-wechat font-semibold">微信版</span><span className="text-[11px] px-2.5 py-0.5 rounded-full bg-xiaohongshu/10 text-xiaohongshu font-semibold">小红书版</span><span className="text-[11px] px-2.5 py-0.5 rounded-full bg-weibo/10 text-weibo font-semibold">微博版</span></div><div className="space-y-1.5"><div className="h-2.5 bg-crystal-200 rounded w-3/4" /><div className="h-2.5 bg-crystal-100 rounded w-full" /><div className="h-2.5 bg-crystal-100 rounded w-5/6" /></div></div> },
  { icon: <Image className="w-7 h-7" />, title: '素材管理', desc: '集中管理图片素材，支持拖拽上传、批量预览，AI 自动提取视觉关键词',
    preview: <div className="mt-5 p-4 rounded-xl bg-crystal-50 border border-crystal-200"><div className="grid grid-cols-3 gap-2.5">{[1,2,3].map(n=><div key={n} className="aspect-square rounded-lg bg-gradient-to-br from-gilt-100 to-gilt-50 flex items-center justify-center"><Image className="w-6 h-6 text-gilt-300/40" /></div>)}</div></div> },
  { icon: <Send className="w-7 h-7" />, title: '多平台分发', desc: '一键推送至微信草稿箱、小红书编辑器、微博发布框，告别重复操作',
    preview: <div className="mt-5 p-4 rounded-xl bg-crystal-50 border border-crystal-200 space-y-2.5">{[{n:'微信草稿箱',c:'#1EBD6A'},{n:'小红书编辑器',c:'#F54A6A'},{n:'微博发布框',c:'#E05244'}].map(p=><div key={p.n} className="flex items-center gap-2.5"><CheckCircle className="w-4 h-4" style={{color:p.c}} /><span className="text-sm text-crystal-700">{p.n}</span></div>)}</div> },
  { icon: <BarChart3 className="w-7 h-7" />, title: '数据看板', desc: '追踪各平台发布记录与推送状态，历史内容随时检索复用',
    preview: <div className="mt-5 p-4 rounded-xl bg-crystal-50 border border-crystal-200"><div className="flex items-end gap-2.5 h-14">{[0.6,0.85,0.45,0.95,0.65,0.8].map((h,i)=><motion.div key={i} initial={{height:0}} whileInView={{height:`${h*100}%`}} transition={{delay:i*0.1,duration:0.5}} className="flex-1 rounded-t bg-gilt-300/30" viewport={{once:true}} />)}</div><div className="flex justify-between mt-2.5 text-[10px] text-crystal-500 font-medium"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div></div> },
];

const USE_CASES = [
  { icon: <Star className="w-6 h-6" />, title: '品牌电商', desc: '产品种草文案批量生成，适配不同平台调性，提升品牌统一性和传播效率' },
  { icon: <Users className="w-6 h-6" />, title: '自媒体矩阵', desc: '一人轻松管理多个平台账号，AI 自动改写适配各平台风格，运营效率翻倍' },
  { icon: <Shield className="w-6 h-6" />, title: '内容服务商', desc: '标准化流程快速交付，为客户提供高质量的多平台代运营内容服务' },
  { icon: <Zap className="w-6 h-6" />, title: 'AI 辅助创作', desc: '创意枯竭时提供灵感火花，智能改写让每一篇都独具风格脱颖而出' },
];

const STEPS = [
  { step: '01', title: '绑定平台账号', desc: '在平台管理页面绑定社交账号，支持微信公众号、微博、小红书一键接入', icon: <Users className="w-7 h-7" /> },
  { step: '02', title: 'AI 智能改写', desc: '输入原始文案，选择目标平台，AI 自动生成各平台风格适配的标题和正文', icon: <Wand2 className="w-7 h-7" /> },
  { step: '03', title: '一键推送到草稿箱', desc: '确认内容后一键推送，微信直接进入草稿箱，小红书自动填入编辑器待发布', icon: <Send className="w-7 h-7" /> },
];

// ===== Floating Tag Cloud =====
const TAG_PALETTE = ['#C8B590', '#A89878', '#D9C9A8', '#B8A080'];

function TagRow({ words, direction, speed, size }: { words: string[]; direction: 'left'|'right'; speed: number; size: 'lg'|'xl'|'2xl' }) {
  const extended = [...words, ...words, ...words];
  const sizeClass = size === '2xl' ? 'text-3xl sm:text-4xl' : size === 'xl' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  return (
    <div className="relative w-full overflow-hidden py-2">
      <motion.div
        className="flex gap-10 whitespace-nowrap items-center"
        animate={{ x: direction === 'left' ? ['0%', '-33.333%'] : ['-33.333%', '0%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {extended.map((word, i) => {
          const color = TAG_PALETTE[i % TAG_PALETTE.length];
          return (
            <span
              key={i}
              className={`shrink-0 select-none font-heading font-extrabold ${sizeClass} tracking-tight`}
              style={{ color, letterSpacing: '-0.02em' }}
            >
              {word}
            </span>
          );
        })}
      </motion.div>
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

  return (
    <div className="bg-crystal-50">
      {/* ======== Hero ======== */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden" style={{ background: 'linear-gradient(180deg, #FCFAF7 0%, #F8F3ED 40%, #FCFAF7 100%)' }}>
        <FunParticleField />

        {/* Subtle crystal orbs */}
        <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-gilt-300/6 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-warm-rose/6 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22,1,0.36,1] }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gilt-300/25 bg-crystal-50/70 backdrop-blur-sm mb-8">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles className="w-4 h-4 text-gilt-400" />
                </motion.div>
                <span className="text-xs font-semibold text-gilt-700 tracking-wide uppercase">Altus 奥途智营 · 多平台内容智能运营</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold text-crystal-900 leading-[1.08] mb-6">
                <span className="block">让 AI 帮你</span>
                <span className="block h-[1.2em] mt-1">运营<RotatingText /></span>
              </h1>

              <p className="text-base sm:text-lg text-crystal-600 max-w-xl mb-10 leading-relaxed">
                输入内容，AI 为微信、小红书、微博自动生成风格适配的标题和文案，一键推送到各平台草稿箱
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(token ? '/generate' : '/account')}
                  className="btn-gilt inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-xl font-bold text-lg">
                  <Play className="w-5 h-5" />{token ? '开始创作' : '免费开始创作'}
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/platforms')}
                  className="btn-crystal inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-xl font-bold text-lg">
                  绑定平台账号 <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {PLATFORM_ORDER.map(pid => {
                  const p = PLATFORMS[pid];
                  return <Link key={pid} to={p.apiStatus==='live'?`/platforms/${pid}`:'/platforms'}
                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-crystal-200 bg-white/50 text-sm font-medium text-crystal-700 hover:text-crystal-900 hover:border-gilt-300/40 transition-all">
                    <span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}} />{p.name}{p.apiStatus==='live'&&<span className="w-1.5 h-1.5 rounded-full bg-gilt-400" />}</Link>;
                })}
              </div>
            </motion.div>

            {/* Right — floating tag cloud */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.8 }}
              className="hidden lg:flex items-center justify-center relative h-[420px]">
              <div className="relative w-full h-full flex flex-col justify-center gap-4 overflow-hidden">
                {/* Row 1 — slow right */}
                <TagRow words={['AI-Powered', 'Smart Publishing', 'Cross-Platform', 'Workflow Automation']} direction="right" speed={50} size="xl" />
                <TagRow words={['Content Operations', 'Auto Adaptation', 'Creative AI', 'Brand Growth', 'Digital Asset']} direction="left" speed={55} size="2xl" />
                <TagRow words={['Copywriting Engine', 'SEO', 'Data Analytics', 'Audience Targeting', 'Content Strategy']} direction="right" speed={45} size="xl" />
                <TagRow words={['WeChat Ecosystem', 'Social CRM', 'Visual Storytelling', 'ROI Tracking', 'Campaigns']} direction="left" speed={60} size="2xl" />
                <TagRow words={['Real-Time Sync', 'Smart Scheduling', 'Performance', 'Engagement AI', 'Omni-Channel']} direction="right" speed={52} size="lg" />
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" animate={{ y: [0,6,0] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className="w-5 h-8 rounded-full border-2 border-crystal-300 flex items-start justify-center p-1"><motion.div className="w-1.5 h-1.5 rounded-full bg-gilt-400" animate={{ y: [0,12,0] }} transition={{ duration: 2, repeat: Infinity }} /></div>
        </motion.div>
      </section>

      {/* ======== Brand ======== */}
      <section className="py-12 text-center border-y border-crystal-200/60">
        <div className="max-w-3xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-gilt-400/30 flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-gilt-600" /></div>
            <span className="text-sm font-semibold text-crystal-600 tracking-widest uppercase">Altus 奥途智营</span>
          </div>
          <p className="text-5xl sm:text-6xl font-heading font-extrabold text-crystal-900">智启内容新高度</p>
          <p className="mt-3 text-crystal-500 text-base">Altus 奥途智营 · 多平台内容智能运营 SaaS</p>
        </div>
      </section>

      {/* ======== Features ======== */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-center mb-12">
            <p className="text-xs font-semibold text-gilt-600 tracking-[0.2em] uppercase mb-3">Core Capabilities</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-crystal-900 mb-4">四大核心能力</h2>
            <p className="text-lg text-crystal-500 max-w-xl mx-auto">从内容生成到多平台分发，AI 覆盖运营全流程</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {FEATURES.map((f,i)=>(
              <motion.div key={f.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
                className="card-premium p-7 rounded-2xl group relative overflow-hidden">
                {/* Top gilt accent line on hover */}
                <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-gilt-400/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-13 h-13 rounded-2xl flex items-center justify-center mb-5 relative"
                  style={{background:'linear-gradient(135deg,rgba(212,191,138,0.15),rgba(212,191,138,0.06))',boxShadow:'0 2px 8px rgba(30,27,22,0.04),inset 0 1px 0 rgba(255,255,255,0.5)'}}>
                  <div className="text-gilt-600 drop-shadow-sm">{f.icon}</div>
                </div>
                <h3 className="font-heading font-bold text-lg text-crystal-900 mb-2.5">{f.title}</h3>
                <p className="text-sm leading-relaxed mb-2" style={{color:'#6B6358'}}>{f.desc}</p>
                {f.preview}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== Stats ======== */}
      <section className="py-10 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl card-stat">
          <motion.div variants={{}} initial="hidden" whileInView="visible" viewport={{once:true}} className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gilt-300/15" onAnimationComplete={()=>setStatsInView(true)}>
            <StatCard label="支持平台" value={4} icon={<TrendingUp className="w-6 h-6 text-gilt-500" />} inView={statsInView} />
            <StatCard label="AI 改写风格" value={4} icon={<Sparkles className="w-6 h-6 text-gilt-400" />} inView={statsInView} />
            <StatCard label="操作步骤" value={3} icon={<Zap className="w-6 h-6 text-gilt-600" />} inView={statsInView} />
            <StatCard label="分钟发布" value={5} suffix="min" icon={<Clock className="w-6 h-6 text-gilt-400" />} inView={statsInView} />
          </motion.div>
        </div>
      </section>

      {/* ======== Workflow ======== */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-center mb-12">
            <p className="text-xs font-semibold text-gilt-600 tracking-[0.2em] uppercase mb-3">How It Works</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-crystal-900 mb-4">三步完成发布</h2>
            <p className="text-lg text-crystal-500">从账号绑定到内容推送，前所未有的简单</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((item,i)=>(
              <motion.div key={item.step} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.12}}
                className="relative text-center p-10 rounded-2xl card-premium group">
                {/* Number badge — 3D elevated */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{background:'linear-gradient(135deg,#C8B590,#A08A60)',boxShadow:'0 4px 12px rgba(160,138,96,0.35),inset 0 1px 0 rgba(255,255,255,0.3)'}}>
                  {item.step}
                </div>
                <div className="inline-flex items-center justify-center w-[4.5rem] h-[4.5rem] rounded-2xl mb-6 mt-3"
                  style={{background:'linear-gradient(135deg,rgba(212,191,138,0.18),rgba(212,191,138,0.06))',boxShadow:'0 2px 8px rgba(30,27,22,0.04),inset 0 1px 0 rgba(255,255,255,0.5)'}}>
                  <div className="text-gilt-600 drop-shadow-sm">{item.icon}</div>
                </div>
                <h3 className="font-heading font-bold text-xl text-crystal-900 mb-3">{item.title}</h3>
                <p className="text-base leading-relaxed" style={{color:'#6B6358'}}>{item.desc}</p>
                {i<STEPS.length-1&&<div className="hidden md:block absolute top-1/2 -right-4 w-8"><div className="h-px bg-gilt-300/30"><div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full" style={{background:'linear-gradient(135deg,#C8B590,#B8A278)',boxShadow:'0 0 8px rgba(180,160,120,0.3)'}} /></div></div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== Use Cases ======== */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} className="text-center mb-12">
            <p className="text-xs font-semibold text-gilt-600 tracking-[0.2em] uppercase mb-3">Use Cases</p>
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-crystal-900 mb-4">适用场景</h2>
            <p className="text-lg text-crystal-500">无论你是个人创作者还是团队运营，都能找到你的方式</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {USE_CASES.map((item,i)=>(
              <motion.div key={item.title} initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*0.08}}
                className="p-8 rounded-2xl card-premium group relative overflow-hidden">
                {/* Subtle corner gleam on hover */}
                <div className="absolute -top-8 -right-8 w-16 h-16 bg-gilt-300/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                  style={{background:'linear-gradient(135deg,rgba(212,191,138,0.15),rgba(212,191,138,0.05))',boxShadow:'0 2px 6px rgba(30,27,22,0.03),inset 0 1px 0 rgba(255,255,255,0.5)'}}>
                  <div className="text-gilt-600 drop-shadow-sm">{item.icon}</div>
                </div>
                <h3 className="font-heading font-bold text-lg text-crystal-900 mb-2.5">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{color:'#6B6358'}}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ======== CTA ======== */}
      <section className="py-16 px-4">
        <motion.div initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}}
          className="max-w-4xl mx-auto text-center p-14 rounded-3xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #8B8070 0%, #A89880 30%, #B8AC98 60%, #8B8070 100%)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/6 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gilt-200/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10">
            <Sparkles className="w-12 h-12 mx-auto mb-6 text-gilt-200/60" />
            <h2 className="text-4xl sm:text-5xl font-heading font-bold text-white mb-5">准备好提升你的运营效率了吗？</h2>
            <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto">免费开始，用 AI 驱动你的多平台内容运营</p>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate(token ? '/generate' : '/account')}
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-white text-gilt-700 font-bold text-lg hover:bg-crystal-50 transition-colors shadow-lg">
              <Sparkles className="w-6 h-6" />免费开始创作
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ======== Brand Watermark ======== */}
      <section className="relative py-24 overflow-hidden">
        <div className="relative max-w-none mx-auto text-center">
          <motion.div initial={{opacity:0}} whileInView={{opacity:1}} viewport={{once:true}} transition={{duration:0.8}} className="relative select-none">
            <h2 className="text-[16vw] sm:text-[14vw] font-heading font-black leading-none tracking-tighter"
              style={{color:'transparent',WebkitTextStroke:'1.5px',WebkitTextStrokeColor:'rgba(200,181,144,0.2)',background:'linear-gradient(180deg,rgba(200,181,144,0.08) 0%,rgba(200,181,144,0.02) 50%,transparent 100%)',backgroundClip:'text',WebkitBackgroundClip:'text'}}>Altus</h2>
            <h2 className="absolute inset-0 text-[16vw] sm:text-[14vw] font-heading font-black leading-none tracking-tighter" aria-hidden="true"
              style={{background:'linear-gradient(135deg,rgba(200,181,144,0.28) 0%,rgba(200,181,144,0.16) 40%,rgba(200,181,144,0.06) 100%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Altus</h2>
          </motion.div>
          <motion.p initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.25}}
            className="text-[7vw] sm:text-[5vw] font-heading font-black tracking-[0.3em] -mt-1"
            style={{color:'transparent',WebkitTextStroke:'1px',WebkitTextStrokeColor:'rgba(200,181,144,0.18)',background:'linear-gradient(180deg,rgba(200,181,144,0.2) 0%,rgba(200,181,144,0.06) 100%)',backgroundClip:'text',WebkitBackgroundClip:'text'}}>奥途智营</motion.p>
          <motion.p initial={{opacity:0,y:10}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:0.4}}
            className="mt-8 text-base text-crystal-500 tracking-wide">Altus 奥途智营 · 智启内容新高度</motion.p>
        </div>
      </section>

      {/* ======== Footer ======== */}
      <footer className="py-8 px-4 border-t border-crystal-200/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gilt-400/30 flex items-center justify-center"><Sparkles className="w-5 h-5 text-gilt-600" /></div>
            <span className="text-sm font-bold text-crystal-800">Altus 奥途智营</span>
          </div>
          <p className="text-sm text-crystal-500">&copy; {new Date().getFullYear()} Altus 奥途智营 · 多平台内容智能运营</p>
          <div className="flex gap-6 text-sm text-crystal-500"><span className="hover:text-crystal-800 cursor-pointer transition-colors">隐私政策</span><span className="hover:text-crystal-800 cursor-pointer transition-colors">服务条款</span><span className="hover:text-crystal-800 cursor-pointer transition-colors">联系我们</span></div>
        </div>
      </footer>
    </div>
  );
}
