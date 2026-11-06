import { useState, useRef, useEffect } from 'react';
import { useCollectionStore } from '../../store/collectionStore';
import { useDeckStore } from '../../store/deckStore';
import { useCommunityStore } from '../../store/communityStore';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';

import { useOTAUpdate } from '../../hooks/useOTAUpdate';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { CollectionBackupModal } from '../collection/CollectionBackupModal';
import { CollectionTextImportModal } from '../collection/CollectionTextImportModal';
import { PWAInstallGuideModal } from '../common/PWAInstallGuideModal';
import { ThemeToggle } from '../common/ThemeToggle';
import { isAdminEmail } from '../../utils/adminAuth';
import { DeleteAccountModal } from './DeleteAccountModal';

/**
 * The account button and its menu.
 *
 * Everything that used to sit loose in the top bar — cloud sync, backup, install,
 * update check and theme — lives here, so the bar itself carries one control
 * instead of six competing ones. The button shows a dot when something actually
 * needs attention, which is the only thing the bar surfaces on its own.
 */

function formatLastSynced(timestamp: number | null): string {
  if (!timestamp) return 'ยังไม่เคยซิงค์';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'เมื่อสักครู่';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const d = new Date(timestamp);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} น.`;
}

/** A menu row. Rows share one shape so the menu reads as a list, not a pile of buttons. */
function MenuRow({
  icon,
  label,
  hint,
  onClick,
  disabled,
  tone = 'default',
  testId,
}: {
  icon: string;
  label: string;
  hint?: string | null;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'accent' | 'danger';
  testId?: string;
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-rose-600 dark:text-rose-300 hover:bg-rose-500/10'
      : tone === 'accent'
      ? 'text-[var(--accent)] hover:bg-[var(--surface-hover)]'
      : 'text-[var(--surface-fg)] hover:bg-[var(--surface-hover)]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`w-full h-9 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-between gap-2 disabled:opacity-60 ${toneClass}`}
    >
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="w-4 text-center shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      {hint && <span className="text-[10px] text-[var(--surface-muted)] shrink-0">{hint}</span>}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-[var(--surface-muted)]">
      {children}
    </p>
  );
}

export function AccountMenu() {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const syncStatus = useCollectionStore((s) => s.syncStatus);
  const lastSyncedAt = useCollectionStore((s) => s.lastSyncedAt);
  const forceSyncCloud = useCollectionStore((s) => s.forceSyncCloud);
  const loadUserDecksFromCloud = useDeckStore((s) => s.loadUserDecksFromCloud);
  const uploadLocalDecksToCloud = useDeckStore((s) => s.uploadLocalDecksToCloud);
  const fetchCommunityStats = useCommunityStore((s) => s.fetchCommunityStats);
  const setGameMode = useGameStore((s) => s.setGameMode);

  const { isChecking, isUpdating, checkForUpdates } = useOTAUpdate();
  // promptInstall falls back to the guide modal where there is no native prompt
  // (iOS Safari), so the guide has to be rendered here for that path to work.
  const { canInstall, promptInstall, showGuideModal, setShowGuideModal, isIOS } = usePWAInstall();

  const [isOpen, setIsOpen] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showTextImportModal, setShowTextImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isSyncing = syncStatus === 'syncing' || isManualSyncing;
  // The only thing the collapsed bar reports: a cloud sync that failed.
  const needsAttention = syncStatus === 'error';

  const handleForceSync = async () => {
    if (!user) {
      signIn();
      return;
    }
    setIsManualSyncing(true);
    try {
      const res = await forceSyncCloud(user.uid);
      await loadUserDecksFromCloud(user.uid);
      await uploadLocalDecksToCloud(user.uid);
      await fetchCommunityStats(true);
      setSyncFeedback(res ? 'ซิงค์ข้อมูลตรงกันแล้ว!' : 'ซิงค์ไม่สำเร็จ (ลองใหม่อีกครั้ง)');
    } catch (e: any) {
      console.error('Force sync failed:', e);
      setSyncFeedback('ซิงค์ล้มเหลว: ' + (e?.message || 'เชื่อมต่อขัดข้อง'));
    } finally {
      setIsManualSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const initial = (user?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <>
      <div className="relative shrink-0" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          disabled={authLoading}
          data-testid="account-button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          title={user ? user.displayName || 'บัญชีผู้ใช้' : 'เข้าสู่ระบบด้วย Google'}
          className="relative h-8 sm:h-9 pl-1 pr-2 sm:pr-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--surface-fg)] text-xs font-bold flex items-center gap-2 transition-colors active:scale-95 disabled:opacity-60"
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover shrink-0"
            />
          ) : (
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] flex items-center justify-center text-xs font-black shrink-0">
              {user ? initial : '👤'}
            </span>
          )}
          <span className="hidden sm:block max-w-[160px] truncate">
            {user ? user.displayName || user.email?.split('@')[0] : authLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </span>
          <span className="text-[10px] text-[var(--surface-muted)]">▾</span>

          {needsAttention && (
            <span
              data-testid="account-attention-dot"
              title="ซิงค์กับคลาวด์ล้มเหลว"
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 bg-rose-500"
            />
          )}
        </button>

        {isOpen && (
          <div
            role="menu"
            data-testid="account-menu"
            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--surface-border)] shadow-2xl p-1.5 z-50 animate-fade-in"
          >
            {/* Identity. Signed out, the account sections are omitted rather than
                shown disabled — but Appearance and App stay, so a guest can still
                switch theme and update the app. */}
            {user ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--surface-muted)] truncate">{user.email}</p>
                </div>

                <SectionLabel>คลาวด์</SectionLabel>
                <MenuRow
                  icon={isSyncing ? '🔄' : syncStatus === 'error' ? '⚠️' : '☁️'}
                  label={isSyncing ? 'กำลังซิงค์สองทาง...' : 'ซิงค์กับคลาวด์ทันที'}
                  hint={syncFeedback || formatLastSynced(lastSyncedAt)}
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  testId="menu-sync"
                />
                <MenuRow
                  icon="💾"
                  label="สำรอง / กู้คืนข้อมูล"
                  onClick={() => {
                    setIsOpen(false);
                    setShowBackupModal(true);
                  }}
                  testId="menu-backup"
                />
              </>
            ) : (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs font-black text-slate-900 dark:text-white">โหมดผู้เยี่ยมชม</p>
                  <p className="text-[11px] text-[var(--surface-muted)]">
                    ข้อมูลเก็บในเครื่องนี้เท่านั้น
                  </p>
                </div>
                <MenuRow
                  icon="☁️"
                  label={authLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
                  hint="ซิงค์ข้ามอุปกรณ์"
                  disabled={authLoading}
                  tone="accent"
                  onClick={() => {
                    setIsOpen(false);
                    signIn();
                  }}
                  testId="menu-signin"
                />
              </>
            )}

            <SectionLabel>แอป</SectionLabel>
            <MenuRow
              icon={isUpdating ? '⚡' : '🔄'}
              label={
                isUpdating
                  ? 'กำลังอัปเดตแอป...'
                  : isChecking
                  ? 'กำลังตรวจหาเวอร์ชันใหม่...'
                  : 'ตรวจหาอัปเดต'
              }
              hint={`v${__APP_VERSION__}`}
              onClick={checkForUpdates}
              disabled={isChecking || isUpdating}
              testId="menu-update"
            />
            <MenuRow
              icon="🔗"
              label="จัดการ Map การ์ด (Mapping)"
              onClick={() => {
                setIsOpen(false);
                setGameMode('mapping');
              }}
              testId="menu-mapping"
            />
            {canInstall && (
              <MenuRow
                icon="📲"
                label="ติดตั้งเป็นแอป"
                onClick={() => {
                  setIsOpen(false);
                  promptInstall();
                }}
                testId="menu-install"
              />
            )}

            <SectionLabel>การแสดงผล</SectionLabel>
            <div className="mx-1.5 mb-1" data-testid="menu-theme">
              <ThemeToggle variant="segmented" />
            </div>

            {user && (
              <>
                <div className="my-1 border-t border-[var(--surface-border)]" />

                {isAdminEmail(user.email) && (
                  <MenuRow
                    icon="📊"
                    label="Admin & Analytics"
                    onClick={() => {
                      setIsOpen(false);
                      setGameMode('admin');
                    }}
                    testId="menu-admin"
                  />
                )}
                <MenuRow
                  icon="🚪"
                  label="ออกจากระบบ"
                  tone="danger"
                  onClick={() => {
                    setIsOpen(false);
                    signOut();
                  }}
                  testId="menu-signout"
                />
                <MenuRow
                  icon="🗑️"
                  label="ลบบัญชีและข้อมูลทั้งหมด"
                  hint="ลบถาวร"
                  tone="danger"
                  onClick={() => {
                    setIsOpen(false);
                    setShowDeleteModal(true);
                  }}
                  testId="menu-delete-account"
                />
              </>
            )}
          </div>
        )}
      </div>

      {showBackupModal && (
        <CollectionBackupModal
          onClose={() => setShowBackupModal(false)}
          onOpenTextImport={() => setShowTextImportModal(true)}
        />
      )}
      {showTextImportModal && (
        <CollectionTextImportModal onClose={() => setShowTextImportModal(false)} />
      )}
      {showDeleteModal && (
        <DeleteAccountModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
      <PWAInstallGuideModal
        isOpen={showGuideModal}
        isIOS={isIOS}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
}
