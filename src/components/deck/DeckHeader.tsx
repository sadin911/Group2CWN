import { AppHeaderBar } from '../layout/AppHeaderBar';

/**
 * Deck page header.
 *
 * Shares `AppHeaderBar` with the Collection page — the toolbar and user menu used
 * to be re-declared here, so any header change had to be made twice. What remains
 * is the deck-specific navigation, which sits in the context strip.
 */

interface Props {
  isEditing?: boolean;
  onBackToDecks?: () => void;
  onOpenImportExport?: () => void;
}

export function DeckHeader({ isEditing, onBackToDecks, onOpenImportExport }: Props) {
  const contextActions = [
    isEditing && onBackToDecks
      ? { key: 'back', icon: '←', label: 'กลับหน้ารวมเด็ค', onClick: onBackToDecks }
      : null,
    !isEditing && onOpenImportExport
      ? { key: 'io', icon: '📦', label: 'นำเข้า / ส่งออกเด็ค', onClick: onOpenImportExport }
      : null,
  ].filter(Boolean) as { key: string; icon: string; label: string; onClick: () => void }[];

  return (
    <AppHeaderBar
      title="PokéDeck"
      tagline="ระบบสร้างเด็คและคำนวณการ์ดที่ขาด"
      titleClassName="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 dark:from-blue-300 dark:via-sky-200 dark:to-yellow-300"
      contextSlot={
        contextActions.length ? (
          <>
            {contextActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                className="h-8 sm:h-9 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--surface-border)] text-[var(--surface-fg)] text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <span aria-hidden="true">{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </>
        ) : undefined
      }
    />
  );
}
