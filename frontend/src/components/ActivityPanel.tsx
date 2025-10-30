import { useMemo, useState } from 'react';
import type { ActivityFeedItem } from '../types';

interface ActivityPanelProps {
  events: ActivityFeedItem[];
}

export function ActivityPanel({ events }: ActivityPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const items = useMemo(() => events.slice(0, 80), [events]);

  return (
    <aside className="fixed bottom-6 right-6 z-40 w-80 max-w-full">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between bg-gray-900 px-4 py-2 text-left text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
        >
          <span>Live Activity</span>
          <span className="text-xs uppercase tracking-wide">{isOpen ? 'Hide' : 'Show'}</span>
        </button>

        {isOpen ? (
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500">No events yet</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3 text-sm">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                      <span className="uppercase tracking-wide">
                        {item.channel === 'analysis' ? 'Analysis' : 'Webhook'}
                      </span>
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-gray-900 font-semibold">{item.title}</p>
                    {item.message ? (
                      <p className="mt-1 text-gray-600 leading-snug">{item.message}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  return date.toLocaleTimeString();
}
