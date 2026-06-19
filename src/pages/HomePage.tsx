import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles, ArrowRight, Wand2, Image, Send,
  Archive, Play, TrendingUp, Users, Zap
} from 'lucide-react';
import PageTransition from '../components/ui/PageTransition';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FunParticleField from '../components/home/FunParticleField';
import AnimatedMascot from '../components/home/AnimatedMascot';
import { useAuthStore } from '../store/authStore';
import { usePlatformStore } from '../store/platformStore';
import { PLATFORMS, PLATFORM_ORDER } from '../config/platforms';
import { staggerContainer, staggerItem } from '../animations/variants';

// Animated counter hook
function useCountUp(target: number, duration = 1500, shouldStart = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart) return;
    let startTime: number;
    let rafId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, shouldStart]);

  return count;
}

function StatCard({ label, value, suffix, icon, inView }: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  inView: boolean;
}) {
  const count = useCountUp(value, 1800, inView);

  return (
    <motion.div
      variants={staggerItem}
      className="text-center p-6"
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 mb-3">
        {icon}
      </div>
      <div className="text-3xl font-heading font-bold text-primary mb-1 font-mono">
        {count}{suffix || ''}
      </div>
      <p className="text-sm text-secondary">{label}</p>
    </motion.div>
  );
}

const QUICK_ACTIONS = [
  {
    to: '/generate',
    label: '内容生成',
    desc: 'AI 智能改写多平台文案',
    icon: <Wand2 className="w-6 h-6 text-emerald-500" />,
    gradient: 'from-emerald-50 to-emerald-100/50',
    primary: true,
  },
  {
    to: '/material',
    label: '素材管理',
    desc: '上传管理图片素材',
    icon: <Image className="w-6 h-6 text-blue-500" />,
    gradient: 'from-blue-50 to-blue-100/50',
  },
  {
    to: '/push',
    label: '推送发布',
    desc: '一键推送到各平台',
    icon: <Send className="w-6 h-6 text-purple-500" />,
    gradient: 'from-purple-50 to-purple-100/50',
  },
  {
    to: '/history',
    label: '历史记录',
    desc: '浏览已发布内容',
    icon: <Archive className="w-6 h-6 text-orange-500" />,
    gradient: 'from-orange-50 to-orange-100/50',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { fetchWechatStatus } = usePlatformStore();
  const [statsInView, setStatsInView] = useState(false);

  useEffect(() => {
    if (token) fetchWechatStatus();
  }, [token]);

  return (
    <PageTransition>
      {/* Hero Section with particle field */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Particle canvas */}
        <FunParticleField />

        {/* Floating mascot */}
        <AnimatedMascot />

        {/* Background gradient orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-200/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-emerald-200 shadow-sm mb-8 backdrop-blur-sm">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
              </motion.div>
              <span className="text-xs font-medium text-emerald-700">
                AI 驱动的多平台内容运营
              </span>
            </div>

            {/* Main title with staggered text */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-extrabold text-primary leading-tight mb-6">
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="block"
              >
                让 AI 帮你
              </motion.span>
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="block text-gradient"
              >
                轻松运营社交媒体
              </motion.span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-base sm:text-lg text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              输入你的内容，AI 自动为微信、小红书、抖音、微博
              生成风格适配的标题和文案，一键推送到各平台草稿箱
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                size="lg"
                onClick={() => navigate(token ? '/generate' : '/account')}
                icon={<Play className="w-4 h-4" />}
                className="text-base"
              >
                {token ? '开始创作' : '免费开始'}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/platforms/wechat')}
                icon={<Zap className="w-4 h-4" />}
              >
                绑定微信
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/platforms/weibo')}
                icon={<Zap className="w-4 h-4" />}
              >
                绑定微博
              </Button>
            </motion.div>
          </motion.div>

          {/* Platform mini badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex justify-center gap-3 mt-12"
          >
            {PLATFORM_ORDER.map((pid) => {
              const p = PLATFORMS[pid];
              return (
                <Link
                  key={pid}
                  to={p.apiStatus === 'live' ? `/platforms/${pid}` : '/platforms'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-border text-xs font-medium text-secondary hover:text-primary hover:border-emerald-300 transition-all shadow-sm"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                  {p.apiStatus === 'live' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="已集成" />
                  )}
                </Link>
              );
            })}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center p-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          onAnimationComplete={() => setStatsInView(true)}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-white/60 backdrop-blur-sm border border-border shadow-sm">
            <StatCard
              label="支持平台"
              value={4}
              icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
              inView={statsInView}
            />
            <StatCard
              label="AI 改写风格"
              value={4}
              icon={<Sparkles className="w-5 h-5 text-emerald-600" />}
              inView={statsInView}
            />
            <StatCard
              label="操作步骤"
              value={3}
              icon={<Zap className="w-5 h-5 text-emerald-600" />}
              inView={statsInView}
            />
            <StatCard
              label="分钟发布"
              value={5}
              suffix="min"
              icon={<Play className="w-5 h-5 text-emerald-600" />}
              inView={statsInView}
            />
          </div>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-heading font-bold text-primary mb-2">
              快速开始
            </h2>
            <p className="text-sm text-secondary">
              三步完成多平台内容发布
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {QUICK_ACTIONS.map((action) => (
              <motion.div key={action.to} variants={staggerItem}>
                <Link to={action.to}>
                  <Card hover shimmer className={`h-full bg-gradient-to-br ${action.gradient}`}>
                    <div className="flex flex-col h-full">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                        action.primary ? 'bg-emerald-500 text-white' : 'bg-white'
                      }`}>
                        {action.icon}
                      </div>
                      <h3 className={`font-heading font-semibold mb-1 ${
                        action.primary ? 'text-emerald-700' : 'text-primary'
                      }`}>
                        {action.label}
                      </h3>
                      <p className="text-xs text-secondary leading-relaxed">{action.desc}</p>
                      <div className="flex-1" />
                      <div className="flex items-center gap-1 mt-4 text-xs font-medium text-emerald-600">
                        立即体验 <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl font-heading font-bold text-primary mb-2">
              三步完成发布
            </h2>
            <p className="text-sm text-secondary">
              从内容到发布，前所未有的简单
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: '绑定平台账号',
                desc: '在平台管理页面绑定你的社交媒体账号，微信支持完整草稿推送',
                icon: <Users className="w-6 h-6" />,
              },
              {
                step: '02',
                title: 'AI 生成内容',
                desc: '输入原始文案，选择平台，AI自动生成各平台风格的标题和正文',
                icon: <Wand2 className="w-6 h-6" />,
              },
              {
                step: '03',
                title: '一键推送到草稿箱',
                desc: '确认内容无误后，一键推送到各平台，微信直接进入草稿箱待发布',
                icon: <Send className="w-6 h-6" />,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="text-center h-full">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
                    {item.icon}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 tracking-widest uppercase mb-2">
                    Step {item.step}
                  </div>
                  <h3 className="font-heading font-semibold text-primary mb-2">{item.title}</h3>
                  <p className="text-xs text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-200"
        >
          <Sparkles className="w-10 h-10 mx-auto mb-4 text-emerald-200" />
          <h2 className="text-2xl font-heading font-bold mb-3">
            准备好提升你的运营效率了吗？
          </h2>
          <p className="text-emerald-100 text-sm mb-8">
            免费开始，用 AI 驱动你的多平台内容运营
          </p>
          <Button
            size="lg"
            onClick={() => navigate(token ? '/generate' : '/account')}
            className="bg-white text-emerald-600 hover:bg-gray-50 hover:text-emerald-700"
          >
            <Sparkles className="w-4 h-4" /> 免费开始创作
          </Button>
        </motion.div>
      </section>
    </PageTransition>
  );
}
