import type { CollectionStats } from '../../types/collection';

/**
 * Collection totals as one pill with hairline dividers.
 *
 * These were three separately coloured chips, which made three related numbers
 * read as three unrelated things. Grouping them keeps the glance-value without
 * spending three accent colours on it.
 */

interface Props {
  stats: CollectionStats;
}

export function HeaderStats({ stats }: Props) {
  const segments: { icon: string; value: string; unit: string; title: string }[] = [
    {
      icon: '🎴',
      value: stats.totalUniqueOwned.toLocaleString(),
      unit: 'แบบ',
      title: 'จำนวนการ์ดที่มีแบบไม่ซ้ำ',
    },
    {
      icon: '✨',
      value: stats.totalCardsCount.toLocaleString(),
      unit: 'ใบ',
      title: 'จำนวนการ์ดทั้งหมดรวมใบซ้ำ',
    },
  ];

  if (stats.wishlistCount > 0) {
    segments.push({
      icon: '⭐',
      value: stats.wishlistCount.toLocaleString(),
      unit: '',
      title: 'การ์ดใน Wishlist',
    });
  }

  return (
    <div
      data-testid="header-stats"
      className="h-8 sm:h-9 flex items-center rounded-xl bg-[var(--surface)] border border-[var(--surface-border)] divide-x divide-[var(--surface-border)] shrink-0"
    >
      {segments.map((segment) => (
        <span
          key={segment.icon}
          title={segment.title}
          className="px-2.5 sm:px-3 flex items-center gap-1.5 text-[11px] sm:text-xs font-black text-[var(--surface-fg)] whitespace-nowrap"
        >
          <span aria-hidden="true">{segment.icon}</span>
          <span>{segment.value}</span>
          {segment.unit && (
            <span className="font-medium text-[var(--surface-muted)] hidden xs:inline">
              {segment.unit}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
