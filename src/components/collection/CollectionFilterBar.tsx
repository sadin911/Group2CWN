import { useState, useRef, useEffect } from "react";
import { ENERGY_TYPES } from "../../constants/energyTypes";
import type { CollectionStatusFilter, CollectionSortBy, SortOrder } from "../../types/collection";
import { REGULATION_SERIES_OPTIONS } from "../../types/collection";
import { SearchableSetSelect, type SetOption } from "../common/SearchableSetSelect";
import { parseSelectedRarities, toggleRarityInSelection } from "../../utils/rarity";

interface Props {
  sets: SetOption[];
  selectedSet: string;
  onSelectSet: (setId: string) => void;

  selectedRegulation: string;
  onRegulationChange: (reg: string) => void;

  statusFilter: CollectionStatusFilter;
  onStatusFilterChange: (status: CollectionStatusFilter) => void;

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

  sortBy: CollectionSortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: CollectionSortBy, sortOrder: SortOrder) => void;

  showFullColor: boolean;
  onToggleFullColor: () => void;

  onResetFilters?: () => void;
  isFiltered?: boolean;

  totalFiltered: number;

  /**
   * Status tabs to leave out. A shared showcase omits ones that would expose
   * more about the owner than they chose to publish.
   */
  hiddenStatuses?: CollectionStatusFilter[];

  /** Sort options to leave out, e.g. price sorting when prices are not shared. */
  hiddenSorts?: CollectionSortBy[];

  /**
   * Hides the full-colour toggle. It only has an effect where some cards are
   * unowned, so a view containing nothing but owned cards should not show it.
   */
  hideFullColorToggle?: boolean;
}

export const RARITY_CLASSES = [
  { id: "ALL", label: "ทุกระดับความหายาก (All Classes)" },
  { id: "SAR", label: "🌟 SAR (Special Art Rare)" },
  { id: "AR", label: "🎨 AR / CHR (Art Rare)" },
  { id: "SR", label: "💎 SR / CSR (Super Rare)" },
  { id: "HR", label: "🌈 HR (Hyper Rare / Rainbow)" },
  { id: "UR", label: "👑 UR / MUR (Gold / การ์ดสีทอง)" },
  { id: "ACE_SPEC", label: "🔮 ACE SPEC (การ์ดเอซสเปก)" },
  { id: "EX", label: "⚡ โปเกมอน ex / เมก้า ex (Pokémon ex)" },
  { id: "VMAX", label: "🔥 โปเกมอน VMAX" },
  { id: "VSTAR", label: "⭐ โปเกมอน VSTAR" },
  { id: "V", label: "⚡ โปเกมอน V" },
  { id: "PROMO", label: "🎁 การ์ดโปรโม (Promo)" },
  { id: "REGULAR", label: "⚪ โปเกมอนทั่วไป (Common / Rare)" },
];



const STATUS_TABS: { key: CollectionStatusFilter; label: string; icon: string }[] = [
  { key: "all", label: "ทั้งหมด", icon: "🎴" },
  { key: "owned", label: "มีแล้ว", icon: "✅" },
  { key: "missing", label: "ยังไม่มี", icon: "⏳" },
  { key: "wishlist", label: "อยากได้", icon: "⭐" },
  { key: "duplicates", label: "มีซ้ำ", icon: "🔁" },
];

const CATEGORIES = [
  { id: "ALL", label: "ทุกหมวดหมู่" },
  { id: "Pokemon", label: "โปเกมอน (Pokémon)" },
  { id: "Trainer", label: "เทรนเนอร์ (Trainer)" },
  { id: "Energy", label: "พลังงาน (Energy)" },
  { id: "ACE_SPEC", label: "🔮 การ์ด ACE SPEC (เอซสเปก)" },
];

const STAGES = [
  { id: "ALL", label: "ทุกสเตจ" },
  { id: "พื้นฐาน", label: "พื้นฐาน (Basic)" },
  { id: "ร่าง 1", label: "ร่าง 1 (Stage 1)" },
  { id: "ร่าง 2", label: "ร่าง 2 (Stage 2)" },
];

export function CollectionFilterBar({
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
  hiddenStatuses,
  hiddenSorts,
  hideFullColorToggle = false,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRarityOpen, setIsRarityOpen] = useState(false);
  const rarityMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rarityMenuRef.current && !rarityMenuRef.current.contains(e.target as Node)) {
        setIsRarityOpen(false);
      }
    }
    if (isRarityOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRarityOpen]);

  const activeRarities = parseSelectedRarities(selectedRarity);
  const isRarityFiltered = !activeRarities.includes("ALL");

  let rarityButtonLabel = "⭐ ทุกระดับ";
  if (isRarityFiltered) {
    if (activeRarities.length === 1) {
      const match = RARITY_CLASSES.find((r) => r.id === activeRarities[0]);
      const displayId = activeRarities[0] === 'ACE_SPEC' ? 'ACE SPEC' : activeRarities[0];
      rarityButtonLabel = match ? `${match.label.split(" ")[0]} ${displayId}` : displayId;
    } else if (activeRarities.length === 2) {
      rarityButtonLabel = `⭐ ${activeRarities.map((r) => (r === 'ACE_SPEC' ? 'ACE SPEC' : r)).join(", ")}`;
    } else {
      rarityButtonLabel = `⭐ ${activeRarities.length} ระดับ`;
    }
  }

  const visibleStatusTabs = hiddenStatuses?.length
    ? STATUS_TABS.filter((tab) => !hiddenStatuses.includes(tab.key))
    : STATUS_TABS;
  const isSortHidden = (option: CollectionSortBy) => !!hiddenSorts?.includes(option);

  // Count active non-default secondary filters
  const activeSecondaryFilterCount = [
    selectedRegulation !== "ALL",
    isRarityFiltered,
    selectedCategory !== "ALL",
    selectedStage !== "ALL",
    selectedType !== "ALL",
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
            placeholder="ค้นหาชื่อการ์ด, เลขการ์ด หรือชื่อชุด..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/90 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-all shadow-inner min-h-[38px] sm:min-h-[40px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 dark:hover:text-white text-xs font-bold p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="ล้างข้อความค้นหา"
            >
              ✕
            </button>
          )}
        </div>

        {/* Set Selector & Multi-Select Rarity Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full lg:w-auto min-w-0 max-w-full">
          <SearchableSetSelect
            sets={sets}
            selectedSet={selectedSet}
            onSelectSet={onSelectSet}
            accentColor="amber"
            showProgress={true}
            className="flex-1 min-w-0 lg:w-80"
          />

          {/* Interactive Multi-Select Rarity Dropdown */}
          <div className="relative shrink-0 min-w-0" ref={rarityMenuRef}>
            <button
              type="button"
              onClick={() => setIsRarityOpen((prev) => !prev)}
              aria-label="เลือกระดับความหายาก (เลือกได้หลายระดับ)"
              aria-expanded={isRarityOpen}
              data-testid="rarity-filter-button"
              className={`w-32 xs:w-36 sm:w-44 px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all shadow-sm focus:outline-none min-h-[38px] sm:min-h-[40px] flex items-center justify-between gap-1 cursor-pointer truncate ${
                isRarityFiltered
                  ? "bg-amber-400 dark:bg-amber-500 text-slate-950 border border-amber-300 dark:border-amber-400 ring-1 ring-amber-400/40 font-black shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700/90 hover:border-amber-400"
              }`}
            >
              <span className="truncate">{rarityButtonLabel}</span>
              <span className="flex items-center gap-1 shrink-0">
                {isRarityFiltered && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRarityChange("ALL");
                    }}
                    className="w-4 h-4 rounded-full bg-slate-900/20 hover:bg-slate-900/40 text-slate-950 flex items-center justify-center text-[10px] font-bold"
                    title="ล้างตัวกรองความหายาก"
                  >
                    ✕
                  </span>
                )}
                <span className={`text-[10px] transition-transform ${isRarityOpen ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </span>
            </button>

            {/* Popover Dropdown Panel */}
            {isRarityOpen && (
              <div
                role="dialog"
                aria-label="รายการความหายาก"
                className="absolute right-0 sm:left-0 sm:right-auto mt-1.5 w-64 sm:w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 p-2.5 flex flex-col gap-2 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      ระดับความหายาก
                    </div>
                    <div className="text-[10px] text-slate-400">
                      เลือกได้หลายระดับพร้อมกัน
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRarityChange("ALL")}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    ล้าง
                  </button>
                </div>

                {/* Options List */}
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => onRarityChange("ALL")}
                    className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      !isRarityFiltered
                        ? "bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>⭐</span>
                      <span>ทุกระดับความหายาก</span>
                    </span>
                    {!isRarityFiltered && <span className="text-amber-500 font-bold">✓</span>}
                  </button>

                  {RARITY_CLASSES.filter((r) => r.id !== "ALL").map((r) => {
                    const isSelected = activeRarities.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onRarityChange(toggleRarityInSelection(selectedRarity, r.id))}
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{isSelected ? "☑" : "☐"}</span>
                          <span className="truncate">{r.label}</span>
                        </span>
                        {isSelected && <span className="text-amber-500 font-bold ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {isRarityFiltered ? `เลือกแล้ว ${activeRarities.length} ระดับ` : "แสดงทุกระดับ"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRarityOpen(false)}
                    className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-sm"
                  >
                    เสร็จสิ้น
                  </button>
                </div>
              </div>
            )}
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
              onChange={(e) => onSortChange(e.target.value as CollectionSortBy, sortOrder)}
              aria-label="เรียงตาม"
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1 px-1.5 rounded-lg truncate w-full"
            >
              <option value="number" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">เลขการ์ด (No.)</option>
              {!isSortHidden("price") && (<option value="price" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">💵 ราคาตลาด (Market Price)</option>)}
              {!isSortHidden("name") && (<option value="name" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ชื่อการ์ด (ก-ฮ)</option>)}
              {!isSortHidden("hp") && (<option value="hp" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">ค่า HP</option>)}
              {!isSortHidden("quantity") && (<option value="quantity" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">จำนวนที่มี (Count)</option>)}
            </select>
            <button
              type="button"
              title={sortOrder === "asc" ? "น้อยไปมาก (คลิกเพื่อสลับเป็นมากไปน้อย)" : "มากไปน้อย (คลิกเพื่อสลับเป็นน้อยไปมาก)"}
              onClick={() => onSortChange(sortBy, sortOrder === "asc" ? "desc" : "asc")}
              className="w-7 h-7 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-center transition-all active:scale-90 border border-slate-300 dark:border-slate-700/60"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {/* Vivid Color Mode Toggle */}
          {!hideFullColorToggle && (
            <button
              type="button"
              onClick={onToggleFullColor}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 min-h-[38px] sm:min-h-[40px] border active:scale-95 ${
                showFullColor
                  ? "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-amber-500 text-white border-pink-400/80 shadow-pink-500/30 ring-1 ring-pink-400/50"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-purple-400"
              }`}
              title={showFullColor ? "โหมดสีสด: เปิดอยู่ (คลิกเพื่อปิด)" : "โหมดสีสด: ปิดอยู่ (คลิกเพื่อชมภาพสีสดทุกใบ)"}
            >
              <span>🎨</span>
              <span className="hidden sm:inline">สีสด</span>
              <span className={`text-[10px] font-mono font-black ${showFullColor ? "text-white" : "text-slate-400"}`}>
                {showFullColor ? "ON" : "OFF"}
              </span>
            </button>
          )}

          {/* Advanced Filters Drawer Toggle */}
          <button
            type="button"
            data-testid="advanced-filter-btn"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 min-h-[38px] sm:min-h-[40px] border active:scale-95 cursor-pointer ${
              showAdvanced || activeSecondaryFilterCount > 0
                ? "bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/60 text-amber-800 dark:text-amber-300 shadow-amber-500/10"
                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
            }`}
            title={showAdvanced ? "คลิกเพื่อพับเก็บแถบตัวกรอง (Hide)" : "คลิกเพื่อเปิดแถบตัวกรอง (Show)"}
          >
            <span>⚙️</span>
            <span>ตัวกรอง</span>
            {activeSecondaryFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {activeSecondaryFilterCount}
              </span>
            )}
            <span className={`text-[10px] transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}>▾</span>
          </button>

          {/* Results Count Badge */}
          <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap flex items-center gap-1 min-h-[38px] sm:min-h-[40px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">{totalFiltered.toLocaleString()}</span>
            <span className="text-slate-400 font-normal hidden xs:inline">ใบ</span>
          </div>
        </div>
      </div>

      {/* Active Multi-Select Rarity Chips Bar */}
      {isRarityFiltered && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 animate-fadeIn">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
            <span>⭐</span>
            <span>ระดับที่เลือก:</span>
          </span>
          {activeRarities.map((rId) => {
            const rClass = RARITY_CLASSES.find((rc) => rc.id === rId);
            return (
              <span
                key={rId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 text-[11px] font-bold shadow-xs"
              >
                <span>{rClass?.label.split(" ")[0] || "⭐"}</span>
                <span>{rId === 'ACE_SPEC' ? 'ACE SPEC' : rId}</span>
                <button
                  type="button"
                  onClick={() => onRarityChange(toggleRarityInSelection(selectedRarity, rId))}
                  className="hover:text-rose-500 ml-0.5 font-bold cursor-pointer transition-colors"
                  title={`ลบตัวกรอง ${rId}`}
                  aria-label={`ลบตัวกรอง ${rId}`}
                >
                  ✕
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => onRarityChange("ALL")}
            className="text-[10px] text-slate-400 hover:text-amber-500 underline ml-1 cursor-pointer font-medium transition-colors"
          >
            ล้างตัวกรองความหายาก
          </button>
        </div>
      )}

      {/* Row 2: Status Filter Tabs (Clean Horizontal Scrollable Bar) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {visibleStatusTabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          let activeClass = "bg-slate-800 text-white font-black";
          if (tab.key === "owned") {
            activeClass = "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/25 font-black ring-1 ring-blue-400/40";
          } else if (tab.key === "missing") {
            activeClass = "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 font-black ring-1 ring-red-400/40";
          } else if (tab.key === "wishlist") {
            activeClass = "bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 shadow-md shadow-yellow-400/25 font-black ring-1 ring-yellow-300/50";
          } else if (tab.key === "duplicates") {
            activeClass = "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/25 font-black ring-1 ring-amber-400/50";
          } else if (tab.key === "all") {
            activeClass = "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-yellow-400/25 font-black ring-1 ring-yellow-300/50";
          }

          return (
            <button
              key={tab.key}
              onClick={() => onStatusFilterChange(tab.key)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                isActive
                  ? activeClass
                  : "bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60"
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
          showAdvanced ? "flex" : "hidden"
        } flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/70 text-xs animate-fade-in`}
      >
        {/* Row A: Regulation & Category.

            Both were rows of horizontally scrolling chips — ten regulation chips
            in particular pushed most of the options off-screen. As selects they
            share one row, show the full label, and cost two rows less height. */}
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
                selectedRegulation !== "ALL"
                  ? "bg-amber-400 border-amber-400 text-slate-950 font-black"
                  : "bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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
                selectedCategory !== "ALL"
                  ? "bg-amber-400 border-amber-400 text-slate-950 font-black"
                  : "bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
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

        {/* Row C: Detailed Dropdowns & Energy Types Bar */}
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
              onClick={() => onTypeChange("ALL")}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black transition-all ${
                selectedType === "ALL"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              ทุกธาตุ
            </button>
            {ENERGY_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => onTypeChange(t.type === selectedType ? "ALL" : t.type)}
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-sm transition-all ${
                  selectedType === t.type
                    ? "ring-2 ring-amber-400 bg-slate-200 dark:bg-slate-700 scale-110 shadow-md"
                    : "bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-75 hover:opacity-100"
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
