import React, { useState, useEffect } from 'react';
import { useCollectionStore } from '../../store/collectionStore';
import { auth } from '../../utils/firebase';
import {
  publishSharedCollection,
  deleteSharedCollection,
  getMyShareRecords,
  type MyShareRecord,
} from '../../services/sharedCollectionService';
import type { ShareSettings } from '../../types/share';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCollectionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profile = useCollectionStore((s) => s.profiles[activeProfileId]);

  const [settings, setSettings] = useState<ShareSettings>({
    showPrices: true,
    showWishlist: true,
    showNotes: false,
  });

  const [ownerName, setOwnerName] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [activeShareRecord, setActiveShareRecord] = useState<MyShareRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQrExpanded, setShowQrExpanded] = useState(false);

  // Initialize owner name & look for existing share record
  useEffect(() => {
    if (!isOpen) return;

    const user = auth.currentUser;
    if (user?.displayName && !ownerName) {
      setOwnerName(user.displayName);
    } else if (!ownerName) {
      setOwnerName('PokéCollector');
    }

    const records = getMyShareRecords();
    const existing = records.find((r) => r.profileId === activeProfileId);
    if (existing) {
      setActiveShareRecord(existing);
      setSettings(existing.settings);
    } else {
      setActiveShareRecord(null);
    }
  }, [isOpen, activeProfileId]);

  if (!isOpen || !profile) return null;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://poke.tcgcount.com';
  const shareUrl = activeShareRecord ? `${baseUrl}/share/${activeShareRecord.shareId}` : '';
  const qrUrl = shareUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(shareUrl)}` : '';

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const user = auth.currentUser;
      const res = await publishSharedCollection({
        profile,
        settings,
        ownerName: ownerName.trim() || 'PokéCollector',
        ownerUid: user?.uid,
        ownerAvatar: user?.photoURL || undefined,
        existingShareId: activeShareRecord?.shareId,
      });

      const updatedRecord: MyShareRecord = {
        shareId: res.snapshot.shareId,
        profileId: profile.id,
        binderName: profile.name,
        publishedAt: res.snapshot.updatedAt,
        settings,
      };
      setActiveShareRecord(updatedRecord);
    } catch (err) {
      console.error('Failed to publish shared collection:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && shareUrl) {
      try {
        await navigator.share({
          title: `สมุดสะสมการ์ดโปเกมอน: ${profile.name}`,
          text: `ส่องสมุดสะสมการ์ดโปเกมอน ${profile.name} ของ ${ownerName} ผ่าน PokéCount Tracker`,
          url: shareUrl,
        });
      } catch {
        // Share sheet cancelled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDeleteShare = async () => {
    if (!activeShareRecord) return;
    if (confirm('คุณต้องการยกเลิกลิงก์แชร์นี้ใช่หรือไม่? ผู้อื่นจะไม่สามารถเปิดดูผ่านลิงก์นี้ได้อีก')) {
      setIsPublishing(true);
      try {
        await deleteSharedCollection(activeShareRecord.shareId);
        setActiveShareRecord(null);
      } finally {
        setIsPublishing(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        data-testid="share-collection-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin rounded-3xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-5 sm:p-6 text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
              🔗
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">แชร์สมุดสะสม (Share Binder)</h3>
              <p className="text-xs text-slate-400">ส่งต่อลิงก์หรือ QR Code ให้เพื่อนและคอมมูนิตี้เปิดดู</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Binder Summary Card */}
        <div className="my-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
              สมุดที่จะแชร์
            </span>
            <div className="text-base font-black text-white truncate flex items-center gap-2">
              <span>{profile.icon || '📁'}</span>
              <span>{profile.name}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              มีการ์ดทั้งหมด {Object.values(profile.cards || {}).reduce((acc, c) => acc + (c.variants?.normal || 0) + (c.variants?.holo || 0) + (c.variants?.reverse || 0) + (c.variants?.promo || 0), 0)} ใบ
            </div>
          </div>
          <div className="shrink-0 text-right">
            {activeShareRecord ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>แชร์อยู่</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-400 text-xs font-bold">
                ยังไม่ได้แชร์
              </span>
            )}
          </div>
        </div>

        {/* Owner Name Input */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-bold text-slate-300 block">
            ชื่อผู้แชร์ (Trainer Name / Shop)
          </label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="เช่น โบ๊ท (Charizard Collector)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Privacy & Showcase Options */}
        <div className="space-y-2.5 mb-5 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
          <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
            ตั้งค่าสิ่งที่ต้องการให้ผู้อื่นมองเห็น
          </div>

          <label className="flex items-center justify-between gap-3 text-xs text-slate-200 cursor-pointer p-1">
            <div className="flex items-center gap-2">
              <span>💵</span>
              <span>แสดงราคาตลาด & มูลค่าประเมินรวม (Market Valuation)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showPrices}
              onChange={(e) => setSettings({ ...settings, showPrices: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-xs text-slate-200 cursor-pointer p-1">
            <div className="flex items-center gap-2">
              <span>⭐</span>
              <span>แสดงการ์ดที่ตามหา (Wishlist)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showWishlist}
              onChange={(e) => setSettings({ ...settings, showWishlist: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded"
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-xs text-slate-200 cursor-pointer p-1">
            <div className="flex items-center gap-2">
              <span>📝</span>
              <span>แสดงบันทึกช่วยจำส่วนตัว (Card Notes)</span>
            </div>
            <input
              type="checkbox"
              checked={settings.showNotes}
              onChange={(e) => setSettings({ ...settings, showNotes: e.target.checked })}
              className="w-4 h-4 accent-amber-500 rounded"
            />
          </label>

        </div>

        {/* Share Link & QR Section (If already published) */}
        {activeShareRecord && (
          <div className="space-y-4 mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-xs font-black text-amber-400 flex items-center justify-between">
              <span>🎉 ลิงก์สำหรับเปิดดูสมุดสะสม</span>
              <span className="text-[10px] text-slate-400 font-normal">
                อัปเดต: {new Date(activeShareRecord.publishedAt).toLocaleDateString('th-TH')}
              </span>
            </div>

            {/* URL Display & Copy */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-amber-300 select-all"
              />
              <button
                type="button"
                data-testid="copy-share-link-btn"
                onClick={handleCopyLink}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs shrink-0 transition-all flex items-center gap-1 shadow-md"
              >
                <span>{copied ? '✅' : '📋'}</span>
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก'}</span>
              </button>
            </div>

            {/* QR Code & Share Shortcuts */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {/* QR Code thumbnail */}
              <div
                onClick={() => setShowQrExpanded(true)}
                className="p-2 rounded-xl bg-white border border-slate-300 shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0"
                title="คลิกเพื่อขยาย QR Code"
              >
                <img src={qrUrl} alt="QR Code" className="w-18 h-18" />
              </div>

              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="text-[11px] text-slate-300 font-medium">
                  ให้เพื่อนเปิดกล้องสแกน QR Code เพื่อเปิดดูสมุดได้ทันที
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <span>📤</span>
                    <span>แชร์...</span>
                  </button>

                  <a
                    href={`https://line.me/R/msg/text/?${encodeURIComponent(`ส่องสมุดสะสมการ์ดโปเกมอน ${profile.name}: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#06C755] hover:bg-[#05b34c] text-xs text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>LINE</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-xs text-white font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <span>Facebook</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {activeShareRecord ? (
            <button
              type="button"
              onClick={handleDeleteShare}
              disabled={isPublishing}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-3 py-2 rounded-xl hover:bg-rose-500/10 transition-colors"
            >
              ยกเลิกลิงก์แชร์
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
            >
              ปิด
            </button>
            <button
              type="button"
              data-testid="publish-share-btn"
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>{isPublishing ? '⏳' : activeShareRecord ? '🔄' : '🚀'}</span>
              <span>{isPublishing ? 'กำลังบันทึก...' : activeShareRecord ? 'อัปเดตข้อมูลลิงก์แชร์' : 'สร้างลิงก์แชร์สมุด'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Expanded Modal */}
        {showQrExpanded && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            onClick={() => setShowQrExpanded(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-6 rounded-3xl bg-slate-900 border border-slate-700 text-center max-w-sm space-y-4 shadow-2xl"
            >
              <h4 className="text-sm font-black text-white">QR Code สแกนดูสมุดสะสม</h4>
              <p className="text-xs text-amber-400 font-medium truncate">{profile.name}</p>
              <div className="p-3 bg-white rounded-2xl inline-block shadow-lg mx-auto">
                <img src={qrUrl} alt="QR Code Large" className="w-56 h-56" />
              </div>
              <p className="text-[11px] text-slate-400">ใช้กล้องมือถือหรือแอปสแกน QR Code เพื่อเปิดดู</p>
              <button
                type="button"
                onClick={() => setShowQrExpanded(false)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
