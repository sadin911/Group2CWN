import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { AdminAuthGate } from './AdminAuthGate';
import { getAnalyticsSummary, clearTelemetryEvents, GA_MEASUREMENT_ID, type AnalyticsSummary } from '../../utils/analytics';
import pokemonCardData from '../../data/pokemonNames.json';
import { MissingPricePanel } from './MissingPricePanel';
import { MappingApprovalPanel } from './MappingApprovalPanel';
import { MetaDecksAdminPanel } from './MetaDecksAdminPanel';
import { PlaymatAccessPanel } from './PlaymatAccessPanel';
import { PlaymatRoomsPanel } from './PlaymatRoomsPanel';
import { AllUsersPanel } from './AllUsersPanel';
import {
  fetchAdminCloudMetrics,
  getCachedAdminCloudMetrics,
  type AdminCloudMetrics,
} from '../../services/adminAnalyticsService';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';

interface AdminPageProps {
  onBackToApp: () => void;
}

type AdminTab =
  | 'overview'
  | 'trends'
  | 'events'
  | 'community'
  | 'users'
  | 'prices'
  | 'approvals'
  | 'metaDecks'
  | 'ga4'
  | 'playmatAccess'
  | 'playmatRooms';

type AdminCategory = 'analytics' | 'community' | 'system';

const TAB_CATEGORIES: Record<
  AdminCategory,
  { label: string; icon: string; tabs: Array<{ id: AdminTab; label: string; icon: string }> }
> = {
  analytics: {
    label: 'สถิติ & กิจกรรม',
    icon: '📊',
    tabs: [
      { id: 'overview', label: 'ภาพรวม & การค้นหา', icon: '📊' },
      { id: 'trends', label: 'Regulation & ธาตุ', icon: '📈' },
      { id: 'events', label: 'บันทึกกิจกรรม (Stream)', icon: '📜' },
      { id: 'ga4', label: 'Google Analytics 4', icon: '⚙️' },
    ],
  },
  community: {
    label: 'ผู้ใช้ & ชุมชน',
    icon: '👥',
    tabs: [
      { id: 'users', label: 'ผู้ใช้ทั้งหมด', icon: '👥' },
      { id: 'community', label: 'ชุมชน & ฐานข้อมูล', icon: '🌐' },
      { id: 'playmatRooms', label: 'ห้องดวล Playmat', icon: '⚔️' },
    ],
  },
  system: {
    label: 'จัดการข้อมูลระบบ',
    icon: '⚙️',
    tabs: [
      { id: 'prices', label: 'ราคาที่ยังขาด', icon: '💵' },
      { id: 'approvals', label: 'อนุมัติการจับคู่การ์ด', icon: '🔗' },
      { id: 'metaDecks', label: 'จัดการเด็คเมต้า', icon: '🏆' },
      { id: 'playmatAccess', label: 'สิทธิ์ Playmat Beta', icon: '🎮' },
    ],
  },
};

export function AdminPage({ onBackToApp }: AdminPageProps) {
  return (
    <AdminAuthGate onExit={onBackToApp}>
      <AdminDashboardContent onBackToApp={onBackToApp} />
    </AdminAuthGate>
  );
}

function AdminDashboardContent({ onBackToApp }: AdminPageProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const totalUsers = useCommunityStore((s) => s.totalUsers);
  const cardOwners = useCommunityStore((s) => s.cardOwners);
  const fetchCommunityStats = useCommunityStore((s) => s.fetchCommunityStats);
  const isCommunityLoading = useCommunityStore((s) => s.loading);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary>(getAnalyticsSummary());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [cloudMetrics, setCloudMetrics] = useState<AdminCloudMetrics | null>(getCachedAdminCloudMetrics());
  const [isCloudLoading, setIsCloudLoading] = useState(false);

  const gaId = GA_MEASUREMENT_ID;

  // Active category derived from activeTab
  const activeCategory: AdminCategory = useMemo(() => {
    for (const [cat, data] of Object.entries(TAB_CATEGORIES)) {
      if (data.tabs.some((t) => t.id === activeTab)) {
        return cat as AdminCategory;
      }
    }
    return 'analytics';
  }, [activeTab]);

  // Reload analytics summary on tab switch or interval
  const reloadAnalytics = () => {
    setSummary(getAnalyticsSummary());
    setLastRefreshed(new Date());
  };

  const loadAllAdminData = async () => {
    reloadAnalytics();
    setIsCloudLoading(true);
    try {
      await fetchCommunityStats(true);
      const metrics = await fetchAdminCloudMetrics();
      setCloudMetrics(metrics);
    } catch (err) {
      console.warn('Failed to load admin cloud metrics:', err);
    } finally {
      setIsCloudLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
    const timer = setInterval(reloadAnalytics, 5000);
    return () => clearInterval(timer);
  }, []);

  const totalPokemonCards = (pokemonCardData as any[]).length;
  const effectiveTotalUsers = cloudMetrics?.users.total ?? (totalUsers || 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between shadow-sm dark:shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            title="กลับไปที่แอปพลิเคชัน"
          >
            <span>←</span>
            <span className="hidden sm:inline">กลับสู่แอป</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}pwa-192x192.png?v=3`}
                alt="PokeCount Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                PokeCount Admin Console
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                System Analytics & Telemetry Control • ข้อมูล ณ {lastRefreshed.toLocaleTimeString('th-TH')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadAllAdminData}
            disabled={isCloudLoading}
            className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
            title="รีเฟรชข้อมูลทั้งหมด"
          >
            <span>🔄</span>
            <span className="hidden sm:inline text-[11px]">{isCloudLoading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>

          {user && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[150px]">
                {user.email}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={signOut}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Top Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm dark:shadow-md">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>👥</span> ผู้ใช้งานที่ลงทะเบียน
            </span>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {effectiveTotalUsers.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">คน</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Active 7 วัน: {(cloudMetrics?.users.active7d ?? 0).toLocaleString()} คน (24 ชม.: {(cloudMetrics?.users.active24h ?? 0).toLocaleString()} คน)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm dark:shadow-md">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>🎴</span> การ์ดที่ถูกครอบครองในระบบ
            </span>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {(cloudMetrics?.community.uniqueCardsOwned ?? Object.keys(cardOwners || {}).length).toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">แบบ</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              จากสมุดสะสมผู้ใช้จริง (Cloud Sync)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm dark:shadow-md">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>📦</span> การ์ดทั้งหมดในระบบ
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {totalPokemonCards.toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ใบ</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Series A - J (การ์ดภาษาไทยครบทั้ง 10 บล็อก)
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm dark:shadow-md">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>⚔️</span> ห้องดวล & การแชร์
            </span>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {(cloudMetrics?.playmat.totalRooms ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ห้อง</span>
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              กำลังดวล: {(cloudMetrics?.playmat.activeRooms ?? 0).toLocaleString()} | แชร์แล้ว: {(cloudMetrics?.shares.totalShares ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Categorized Tab Navigation */}
        <div className="space-y-2.5">
          {/* Level 1: Category Switcher */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {(['analytics', 'community', 'system'] as AdminCategory[]).map((cat) => {
              const catData = TAB_CATEGORIES[cat];
              const isCatActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setActiveTab(catData.tabs[0].id);
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    isCatActive
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <span>{catData.icon}</span>
                  <span>{catData.label}</span>
                </button>
              );
            })}
          </div>

          {/* Level 2: Sub-tabs within the active category */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TAB_CATEGORIES[activeCategory].tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TAB 1: Overview & Search Trends */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span><strong>บันทึกกิจกรรมประจำเครื่อง (Local Session Telemetry):</strong> ข้อมูลในแท็บนี้รวบรวมจากเซสชันเบราว์เซอร์เครื่องนี้</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {gaId ? `เชื่อมต่อ GA4 Cloud แล้ว (${gaId})` : 'โหมดบันทึก Local'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Search Terms */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🔥</span> คำค้นหายอดนิยม (Top Searched Cards)
                </h2>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {summary.topSearchTerms.length} คำค้นหา
                </span>
              </div>

              {summary.topSearchTerms.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic">
                  ยังไม่มีประวัติการค้นหาการ์ดที่บันทึกไว้ในเซสชันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {summary.topSearchTerms.map((item, idx) => {
                    const maxCount = summary.topSearchTerms[0]?.count || 1;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <div
                        key={item.term}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-600 dark:text-slate-400">
                              {idx + 1}
                            </span>
                            {item.term}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-mono font-bold text-xs">
                            {item.count} ครั้ง
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Action Metrics */}
            <div className="space-y-6">
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>⚡</span> กิจกรรมการสะสมการ์ด (Collection Actions)
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">➕</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">เพิ่มลงสมุด</p>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                      {summary.cardActions.add}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">➖</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">ลบจากการสะสม</p>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                      {summary.cardActions.remove}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">⭐</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Wishlist</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {summary.cardActions.wishlist}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🃏</span> กิจกรรมจัดเด็ค (Deck Builder Actions)
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">✨</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">สร้างเด็คใหม่</p>
                    <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {summary.deckActions.created}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">📥</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Import เด็ค</p>
                    <p className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                      {summary.deckActions.imported}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">📤</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Export เด็ค</p>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
                      {summary.deckActions.exported}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-lg">🃏</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">ใส่การ์ดในเด็ค</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                      {summary.deckActions.cardsAdded || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* TAB 2: Trends & Breakdown */}
        {activeTab === 'trends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Regulation Filter Popularity */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎴</span> Regulation Series Usage
              </h2>
              {Object.keys(summary.regulationFilterUsage).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">ยังไม่มีการคลิกเลือกตัวกรอง Regulation</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(summary.regulationFilterUsage)
                    .sort(([, a], [, b]) => b - a)
                    .map(([reg, count]) => (
                      <div
                        key={reg}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {reg === 'STANDARD'
                            ? '⚡ Standard (HIJ)'
                            : reg === 'EXPANDED'
                            ? '🌌 Expanded (A-J ครบทุกบล็อก)'
                            : reg === 'ALL'
                            ? '🌐 ทุกชุด (ALL)'
                            : `Series ${reg}`}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                          {count} ครั้ง
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Category Filter Popularity */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📦</span> Category Filter Popularity
              </h2>
              {Object.keys(summary.categoryFilterUsage).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">ยังไม่มีการคลิกเลือกตัวกรองหมวดหมู่</p>
              ) : (
                <div className="space-y-2.5">
                  {Object.entries(summary.categoryFilterUsage)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {cat === 'Pokemon' ? '👾 โปเกมอน (Pokémon)' : cat === 'Trainer' ? '🎒 เทรนเนอร์ (Trainer)' : '⚡ พลังงาน (Energy)'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono font-bold">
                          {count} ครั้ง
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Energy Type Filter Usage */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl md:col-span-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>✨</span> Energy Element Filter Popularity
              </h2>
              {Object.keys(summary.typeFilterUsage).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">ยังไม่มีการคลิกเลือกตัวกรองธาตุพลังงาน</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(summary.typeFilterUsage)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, count]) => (
                      <div
                        key={type}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-300">{type}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Set Filter Usage */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl md:col-span-2">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📦</span> ชุดการ์ดยอดนิยม (Top Filtered Expansion Sets)
              </h2>
              {Object.keys(summary.setFilterUsage).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic py-4">ยังไม่มีการคลิกเลือกตัวกรองชุดการ์ด</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(summary.setFilterUsage)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 12)
                    .map(([setKey, count]) => (
                      <div
                        key={setKey}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate mr-2" title={setKey}>
                          {setKey}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono font-bold shrink-0">
                          {count} ครั้ง
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Telemetry Stream */}
        {activeTab === 'events' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm dark:shadow-xl flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>📜</span> Chronological Telemetry Stream
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {summary.eventsLog.length} events
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('คุณต้องการล้างประวัติ Telemetry ทั้งหมดใช่หรือไม่?')) {
                      clearTelemetryEvents();
                      reloadAnalytics();
                    }
                  }}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold transition-all"
                >
                  ล้างประวัติ
                </button>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs max-h-[500px] overflow-y-auto pr-2 flex-1">
              {summary.eventsLog.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 italic py-12 text-center">
                  ยังไม่มีประวัติกิจกรรม Telemetry ในเซสชันนี้
                </p>
              ) : (
                summary.eventsLog.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-slate-700 dark:text-slate-300 text-[11px]"
                  >
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase shrink-0">
                      {ev.category}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white shrink-0">{ev.action}</span>
                    <span className="text-slate-500 dark:text-slate-400 truncate">{ev.label || '-'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Community & Database Sync */}
        {/* TAB: Thai cards still without a market price */}
        {activeTab === 'prices' && <MissingPricePanel />}

        {activeTab === 'community' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm dark:shadow-xl max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>🌐</span> สถิติชุมชน & ฐานข้อมูลกลาง (Community Stats)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สถิติจำนวนผู้สะสมการ์ดและการ์ดที่มีผู้ครอบครองมากที่สุดจาก Cloud Firestore
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchCommunityStats(true)}
                disabled={isCommunityLoading}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{isCommunityLoading ? 'กำลังดึง...' : 'ดึงข้อมูลใหม่'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">จำนวนนักสะสมในระบบ</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {totalUsers} คน
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">การ์ดที่ถูกครอบครองในระบบ</span>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {Object.keys(cardOwners || {}).length.toLocaleString()} แบบ
                </p>
              </div>
            </div>

            {/* Top Owned Cards in Community */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                การ์ดที่มีผู้ครอบครองสูงสุดในระบบ (Top Owned Community Cards)
              </h3>
              {Object.keys(cardOwners || {}).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic">ไม่มีข้อมูลการครอบครอง</p>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {Object.entries(cardOwners || {})
                    .sort(([, a], [, b]) => (b || 0) - (a || 0))
                    .slice(0, 20)
                    .map(([cardId, count], idx) => {
                      const card = (pokemonCardData as any[]).find((c) => c.id === cardId);
                      const displayName = card?.nameTh || card?.name || cardId;
                      const totalCollectors = cloudMetrics?.community.totalUsers || totalUsers || 1;
                      const pct = Math.round((count / totalCollectors) * 100);
                      const imageSrc = resolveCardImageUrl(card, false);

                      return (
                        <div
                          key={cardId}
                          className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                              {idx + 1}
                            </span>
                            <div className="w-8 h-11 rounded overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shrink-0 flex items-center justify-center">
                              {card ? (
                                <img
                                  src={imageSrc}
                                  alt={displayName}
                                  onError={(e) => handleCardImageError(e, card)}
                                  className="w-full h-full object-contain"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-[10px] text-slate-400 dark:text-slate-600">?</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{displayName}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono truncate">
                                <span>{cardId}</span>
                                {card?.set?.name && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[130px]">{card.set.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 font-bold font-mono text-xs">
                              {count} คนครอบครอง <span className="text-slate-500 dark:text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: All Registered Users Directory */}
        {activeTab === 'users' && <AllUsersPanel />}

        {/* TAB 6: Mapping Approvals */}
        {activeTab === 'approvals' && <MappingApprovalPanel />}

        {/* TAB 7: Meta Decks Manager */}
        {activeTab === 'metaDecks' && <MetaDecksAdminPanel />}

        {/* TAB 8: Playmat Access Control (Beta Allowlist) */}
        {activeTab === 'playmatAccess' && <PlaymatAccessPanel />}

        {/* TAB 8: Playmat Rooms Manager */}
        {activeTab === 'playmatRooms' && <PlaymatRoomsPanel />}

        {/* TAB 9: GA4 Configuration */}
        {activeTab === 'ga4' && (
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm dark:shadow-xl max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
                📈
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Google Analytics 4 (GA4)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เชื่อมต่อ Google Analytics สำหรับดูสถิติผู้เข้าชมเว็บไซต์ทั่วโลก
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
              <p className="font-bold text-slate-800 dark:text-slate-200">วิธีการติดตั้ง GA4 ใน PokéCount Tracker:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px]">
                <li>สร้าง Web Data Stream ใน Google Analytics 4 Property ของคุณ</li>
                <li>คัดลอก Measurement ID (รูปแบบ: <code className="text-amber-600 dark:text-amber-300 font-mono">G-XXXXXXXXXX</code>)</li>
                <li>
                  ใส่ในไฟล์ <code className="text-emerald-600 dark:text-emerald-300">.env.local</code>:
                  <pre className="mt-1.5 p-2.5 rounded-xl bg-slate-100 dark:bg-black/70 border border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-300 font-mono text-[11px]">
                    VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
                  </pre>
                </li>
              </ol>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">สถานะการเชื่อมต่อ:</span>
              {gaId ? (
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>●</span> เชื่อมต่อแล้ว ({gaId})
                </span>
              ) : (
                <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span>○</span> โหมด Telemetry ภายใน (Local Standalone)
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
