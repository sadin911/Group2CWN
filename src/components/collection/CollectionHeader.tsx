import { useState } from 'react';
import { useCollectionStore } from '../../store/collectionStore';
import { useCustomBinderStore } from '../../store/customBinderStore';
import { AppHeaderBar } from '../layout/AppHeaderBar';
import { HeaderStats } from '../layout/HeaderStats';
import { ProfileManagerModal } from './ProfileManagerModal';
import { CollectionTextImportModal } from './CollectionTextImportModal';
import { CardCameraScannerModal } from './CardCameraScannerModal';
import { CardMappingStudioModal } from './CardMappingStudioModal';
import { ShareCollectionModal } from './ShareCollectionModal';
import type { CollectionStats } from '../../types/collection';

/**
 * Collection page header.
 *
 * The bar itself, the account menu and every tool that used to live up here are
 * now `AppHeaderBar`'s concern. What is left is what belongs to this page: which
 * binder is open, and how much is in it.
 */

// Feature flag: ปิดใช้งานกล้องชั่วคราวตามคำขอของผู้ใช้ (เก็บโค้ดไว้ไม่ลบ)
const ENABLE_CAMERA_SCANNER = false;

interface Props {
  stats: CollectionStats;
  catalogMode?: 'TH' | 'EN';
  onToggleCatalogMode?: (mode: 'TH' | 'EN') => void;
}

export function CollectionHeader({ stats, catalogMode = 'TH', onToggleCatalogMode }: Props) {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfile = profiles[activeProfileId];

  const viewMode = useCustomBinderStore((s) => s.viewMode);
  const setViewMode = useCustomBinderStore((s) => s.setViewMode);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTextImport, setShowTextImport] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<'excel' | 'text' | 'voice' | undefined>(undefined);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showMappingStudio, setShowMappingStudio] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <>
      <AppHeaderBar
        title="PokéCollection"
        tagline="สมุดสะสมการ์ดโปเกมอนภาษาไทย"
        titleClassName="bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 dark:from-yellow-300 dark:via-amber-400 dark:to-yellow-500"
        contextSlot={
          <>
            {ENABLE_CAMERA_SCANNER && (
              <button
                type="button"
                onClick={() => setShowCameraScanner(true)}
                data-testid="camera-scan-button"
                title="สแกนการ์ดต่อเนื่องด้วยกล้อง OCR (Camera OCR Scanner)"
                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                <span className="text-sm shrink-0">📷</span>
                <span className="font-extrabold hidden md:inline">สแกน</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setImportInitialTab('voice');
                setShowTextImport(true);
              }}
              data-testid="voice-import-button"
              title="สั่งการ์ดเข้าคลังด้วยเสียง (Voice Card Input)"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <span className="text-sm shrink-0">🎙️</span>
              <span className="font-extrabold hidden md:inline">สั่งด้วยเสียง</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleCatalogMode?.(catalogMode === 'TH' ? 'EN' : 'TH')}
              data-testid="region-catalog-toggle"
              title={
                catalogMode === 'TH'
                  ? 'สลับไปดูคลังการ์ดภาษาอังกฤษ 6,779 ใบ (English Cards)'
                  : 'สลับกลับไปดูสมุดสะสมการ์ดภาษาไทย (Thai Cards)'
              }
              className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shrink-0 shadow-sm ${
                catalogMode === 'EN'
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400 shadow-sky-600/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-sky-500'
              }`}
            >
              <span>{catalogMode === 'TH' ? '🇺🇸' : '🇹🇭'}</span>
              <span className="hidden md:inline">{catalogMode === 'TH' ? 'การ์ด EN' : 'การ์ดไทย'}</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'binder' ? 'grid' : 'binder')}
              data-testid="binder-view-toggle"
              title={
                viewMode === 'binder'
                  ? 'สลับกลับไปมุมมองตารางปกติ (Grid View)'
                  : 'เปิดมุมมองสมุดสะสม 3D เสมือนจริง (Virtual 3D Binder)'
              }
              className={`h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all shrink-0 shadow-sm ${
                viewMode === 'binder'
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 border-amber-400 shadow-amber-500/30'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-600 dark:text-amber-400'
              }`}
            >
              <span className="text-sm shrink-0">📖</span>
              <span className="font-extrabold hidden md:inline">
                {viewMode === 'binder' ? 'ตารางปกติ' : 'สมุดสะสม 3D'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowMappingStudio(true)}
              data-testid="card-mapping-button"
              title="ระบบเชื่อมโยงการ์ดไทย ⇄ อังกฤษ (Thai-English Card Mapping Studio)"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <span className="text-sm shrink-0">🔄</span>
              <span className="font-extrabold hidden md:inline">จับคู่ TH-EN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setImportInitialTab(undefined);
                setShowTextImport(true);
              }}
              data-testid="text-import-button"
              title="นำเข้าการ์ดจาก Excel, CSV, ข้อความ หรือเสียง (Import from Excel, CSV, text, voice)"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--surface-fg)] text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
            >
              <span className="text-sm shrink-0">📥</span>
              <span className="font-extrabold hidden md:inline">นำเข้า</span>
            </button>

            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              data-testid="share-collection-button"
              title="แชร์สมุดสะสมของคุณเป็นลิงก์สาธารณะหรือ QR Code (Share Collection)"
              className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-sm"
            >
              <span className="text-sm shrink-0">🔗</span>
              <span className="font-extrabold hidden md:inline">แชร์</span>
            </button>

            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              data-testid="profile-switcher"
              title="คลิกเพื่อจัดการและสลับสมุดสะสม"
              className="h-8 sm:h-9 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--surface-fg)] text-xs font-bold flex items-center gap-1.5 transition-colors min-w-0"
            >
              <span className="text-sm shrink-0" aria-hidden="true">
                {activeProfile?.icon || '🎴'}
              </span>
              <span className="max-w-[160px] truncate font-extrabold">
                {activeProfile?.name || 'สมุดสะสม'}
              </span>
              <span className="text-[10px] text-[var(--surface-muted)] shrink-0">▾</span>
            </button>

            <HeaderStats stats={stats} />
          </>
        }
      />

      {showShareModal && <ShareCollectionModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} />}
      {showProfileModal && <ProfileManagerModal onClose={() => setShowProfileModal(false)} />}
      {showTextImport && (
        <CollectionTextImportModal
          initialTab={importInitialTab}
          onClose={() => {
            setShowTextImport(false);
            setImportInitialTab(undefined);
          }}
        />
      )}
      {showMappingStudio && (
        <CardMappingStudioModal onClose={() => setShowMappingStudio(false)} />
      )}
      {ENABLE_CAMERA_SCANNER && showCameraScanner && (
        <CardCameraScannerModal onClose={() => setShowCameraScanner(false)} />
      )}
    </>
  );
}
