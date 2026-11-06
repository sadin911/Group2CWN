import { useState } from 'react';
import { ENERGY_TYPES } from '../../constants/energyTypes';
import { REGULATION_SERIES_OPTIONS } from '../../types/collection';
import { SearchableSetSelect, type SetOption } from '../common/SearchableSetSelect';
import { RARITY_CLASSES } from './CollectionFilterBar';

export type EnglishCatalogStatusFilter = 'all' | 'matched' | 'unmatched';
export type EnglishCatalogSortBy = 'number' | 'name' | 'hp' | 'rarity' | 'price';
export type SortOrder = 'asc' | 'desc';

interface Props {
  sets: SetOption[];
  selectedSet: string;
  onSelectSet: (setId: string) => void;

  selectedRegulation: string;
  onRegulationChange: (reg: string) => void;

  statusFilter: EnglishCatalogStatusFilter;
  onStatusFilterChange: (status: EnglishCatalogStatusFilter) => void;

  search: string;
  onSearchChange: (val: string) => void;

  selectedType: string;
  onTypeChange: (val: string) => void;

  selectedCategory: string;
  onCategoryChange: (val: string) => void;

  selectedStage: string;
  onStageChange: (val: string) => void;

  selectedRarity: string;
  onRarityChange: (val: string) => void;

  sortBy: EnglishCatalogSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: EnglishCatalogSortBy, sortOrder: SortOrder) => void;

  showFullColor: boolean;
  onToggleFullColor: () => void;

  onResetFilters?: () => void;
  isFiltered?: boolean;

  totalFiltered: number;
}

const STATUS_TABS: { key: EnglishCatalogStatusFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'ทั้งหมด (All)', icon: '🎴' },
  { key: 'matched', label: 'มีคู่การ์ดไทย (Matched)', icon: '🇹🇭' },
  { key: 'unmatched', label: 'ยังไม่พบคู่ (Unmatched)', icon: '❓' },
];

const CATEGORIES = [
  { id: 'ALL', label: 'ทุกหมวดหมู่' },
  { id: 'Pokemon', label: 'โปเกมอน (Pokémon)' },
  { id: 'Trainer', label: 'เทรนเนอร์ (Trainer)' },
  { id: 'Energy', label: 'พลังงาน (Energy)' },
  { id: 'ACE_SPEC', label: '🔮 การ์ด ACE SPEC (เอซสเปก)' },
];

const STAGES = [
  { id: 'ALL', label: 'ทุกสเตจ' },
  { id: 'Basic', label: 'พื้นฐาน (Basic)' },
  { id: 'Stage 1', label: 'ร่าง 1 (Stage 1)' },
  { id: 'Stage 2', label: 'ร่าง 2 (Stage 2)' },
];

export function EnglishFilterBar({
  sets,
  selectedSet,
  onSelectSet,
  selectedRegulation,
  onRegulationChange,
  statusFilter,
  onStatusFilterChange,
  search,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCategory,
  onCategoryChange,
  selectedStage,
  onStageChange,
  selectedRarity,
  onRarityChange,
  sortBy,
  sortOrder,
  onSortChange,
  showFullColor,
  onToggleFullColor,
  onResetFilters,
  isFiltered = false,
  totalFiltered,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count active non-default secondary filters
  const activeSecondaryFilterCount = [
    selectedRegulation !== 'ALL',
    selectedRarity !== 'ALL',
    selectedCategory !== 'ALL',
    selectedStage !== 'ALL',
    selectedType !== 'ALL',
  ].filter(Boolean).length;

  return (
    <div className="relative z-20 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/90 px-3 sm:px-8 py-2.5 sm:py-3 space-y-2 sm:space-y-2.5 shadow-sm dark:shadow-md transition-colors duration-200">
      {/* Top Search & Set Selector Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 sm:gap-2.5">
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            data-testid="en-search-input"
            placeholder="ค้นหาชื่อการ์ด, เลขการ์ด หรือชื่อชุด..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/90 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner min-h-[38px] sm:min-h-[40px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="ล้างข้อความค้นหา"
            >
              ✕
            </button>
          )}
        </div>

        {/* Set Selector & Outside Rarity Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto min-w-0 max-w-full">
          <SearchableSetSelect
            sets={sets}
            selectedSet={selectedSet}
            onSelectSet={onSelectSet}
            accentColor="indigo"
            showProgress={false}
            className="flex-1 min-w-0 lg:w-80"
          />

          {/* Compact Outside Rarity Dropdown */}
          <div className="w-28 xs:w-32 sm:w-44 shrink-0 min-w-0">
            <select
              value={selectedRarity}
              onChange={(e) => onRarityChange(e.target.value)}
              aria-label="เลือกระดับความหายาก"
              className={`w-full px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none min-h-[38px] sm:min-h-[40px] truncate cursor-pointer ${
                selectedRarity !== 'ALL'
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white border border-indigo-400 ring-1 ring-indigo-400/40 font-black shadow-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/90 hover:border-indigo-400'
              }`}
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold">
                ⭐ ทุกระดับ
              </option>
              {RARITY_CLASSES.filter((r) => r.id !== 'ALL').map((r) => (
                <option key={r.id} value={r.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Toolbar on Desktop / Single Full-Width Row on Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-between lg:justify-end">
          {/* Quick Sort Dropdown + Direction Toggle */}
          <div
            className="flex-1 lg:flex-initial flex items-center gap-1 p-1 sm:p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 shadow-sm min-h-[38px] sm:min-h-[40px] min-w-0"
            title="เรียงลำดับการ์ด"
          >
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as EnglishCatalogSortBy, sortOrder)}
              aria-label="เรียงตาม"
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1 px-1.5 rounded-lg truncate w-full"
            >
              <option value="number" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">เลขการ์ด (No.)</option>
              <option value="price" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">💵 ราคาตลาด (Market Price)</option>
              <option value="name" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ชื่อการ์ด (A-Z)</option>
              <option value="hp" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ค่า HP</option>
              <option value="rarity" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ความหายาก (Rarity)</option>
            </select>
            <button
              type="button"
              title={sortOrder === 'asc' ? 'น้อยไปมาก (คลิกเพื่อสลับเป็นมากไปน้อย)' : 'มากไปน้อย (คลิกเพื่อสลับเป็นน้อยไปมาก)'}
              onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
              className="w-7 h-7 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-all active:scale-90 border border-slate-300 dark:border-slate-700/60"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Vivid Color Mode Toggle */}
          <button
            type="button"
            onClick={onToggleFullColor}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 min-h-[38px] sm:min-h-[40px] border active:scale-95 ${
              showFullColor
                ? 'bg-gradient-to-r from-fuchsia-600 via-pink-600 to-indigo-500 text-white border-pink-400/80 shadow-pink-500/30 ring-1 ring-pink-400/50'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-400'
            }`}
            title={showFullColor ? 'โหมดสีสด: เปิดอยู่ (คลิกเพื่อปิด)' : 'โหมดสีสด: ปิดอยู่ (คลิกเพื่อชมภาพสีสดทุกใบ)'}
          >
            <span>🎨</span>
            <span className="hidden sm:inline">สีสด</span>
            <span className={`text-[10px] font-mono font-black ${showFullColor ? 'text-white' : 'text-slate-400'}`}>
              {showFullColor ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Advanced Filters Drawer Toggle */}
          <button
            type="button"
            data-testid="english-advanced-filter-btn"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 min-h-[38px] sm:min-h-[40px] border active:scale-95 cursor-pointer ${
              showAdvanced || activeSecondaryFilterCount > 0
                ? 'bg-indigo-100 dark:bg-indigo-500/20 border-indigo-300 dark:border-indigo-500/60 text-indigo-800 dark:text-indigo-300 shadow-indigo-500/10'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
            title={showAdvanced ? 'คลิกเพื่อพับเก็บแถบตัวกรอง (Hide)' : 'คลิกเพื่อเปิดแถบตัวกรอง (Show)'}
          >
            <span>⚙️</span>
            <span>ตัวกรอง</span>
            {activeSecondaryFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px] font-black">
                {activeSecondaryFilterCount}
              </span>
            )}
            <span className={`text-[10px] transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {/* Results Count Badge */}
          <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1 min-h-[38px] sm:min-h-[40px]">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{totalFiltered.toLocaleString()}</span>
            <span className="text-slate-400 font-normal hidden xs:inline">ใบ</span>
          </div>
        </div>
      </div>

      {/* Row 2: Status Filter Tabs (Clean Horizontal Scrollable Bar) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          let activeClass = 'bg-slate-800 text-white font-black';
          if (tab.key === 'matched') {
            activeClass = 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 font-black ring-1 ring-emerald-400/40';
          } else if (tab.key === 'unmatched') {
            activeClass = 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-500/25 font-black ring-1 ring-rose-400/40';
          } else if (tab.key === 'all') {
            activeClass = 'bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25 font-black ring-1 ring-indigo-400/50';
          }

          return (
            <button
              key={tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                isActive
                  ? activeClass
                  : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Drawer (Clean Collapsible on All Screen Sizes) */}
      <div
        className={`${
          showAdvanced ? 'flex' : 'hidden'
        } flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/70 text-xs animate-fade-in`}
      >
        {/* Row A: Regulation & Category */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap shrink-0">
              Regulation:
            </span>
            <select
              value={selectedRegulation}
              onChange={(e) => onRegulationChange(e.target.value)}
              aria-label="กรองตามซีรีส์ / เรกูเลชัน"
              data-testid="regulation-select"
              className={`h-8 px-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-colors cursor-pointer max-w-[220px] truncate ${
                selectedRegulation !== 'ALL'
                  ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              {REGULATION_SERIES_OPTIONS.map((reg) => (
                <option
                  key={reg.id}
                  value={reg.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {reg.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold whitespace-nowrap shrink-0">
              หมวดหมู่:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              aria-label="กรองตามหมวดหมู่การ์ด"
              data-testid="category-select"
              className={`h-8 px-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-colors cursor-pointer max-w-[200px] truncate ${
                selectedCategory !== 'ALL'
                  ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                  : 'bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              {CATEGORIES.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  {cat.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Row B: Stage, Energy Types & Reset Button */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Stage Dropdown */}
          <select
            value={selectedStage}
            onChange={(e) => onStageChange(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none shadow-inner"
          >
            {STAGES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Energy Types Filter Bar */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
            <button
              onClick={() => onTypeChange('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                selectedType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              ทุกธาตุ
            </button>
            {ENERGY_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => onTypeChange(t.type === selectedType ? 'ALL' : t.type)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all ${
                  selectedType === t.type
                    ? 'ring-2 ring-indigo-400 bg-slate-200 dark:bg-slate-700 scale-110 shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-75 hover:opacity-100'
                }`}
                title={t.type}
              >
                {t.emoji}
              </button>
            ))}
          </div>

          {/* Reset Filters Button */}
          {isFiltered && onResetFilters && (
            <button
              onClick={onResetFilters}
              className="ml-auto px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 active:scale-95"
            >
              <span>✕</span>
              <span>ล้างตัวกรองทั้งหมด</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
