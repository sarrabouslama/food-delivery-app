import type { AuditLog } from '../types';
import { UiIcon } from './UiIcons';
import './OrderTimeline.css';

interface Props {
  logs: AuditLog[];
  liveEvents?: AuditLog[];
}

const eventIcons: Record<string, 'receipt' | 'check' | 'chef' | 'package' | 'delivery' | 'spark' | 'customer' | 'wallet' | 'clock'> = {
  ORDER_CREATED: 'receipt',
  ORDER_CONFIRMED: 'check',
  ORDER_PREPARING: 'chef',
  ORDER_READY: 'package',
  ORDER_OUT_FOR_DELIVERY: 'delivery',
  ORDER_DELIVERED: 'spark',
  ORDER_CANCELLED: 'customer',
  PAYMENT_RECEIVED: 'wallet',
  PAYMENT_FAILED: 'clock',
};

const eventLabels: Record<string, string> = {
  ORDER_CREATED: 'Order Created',
  ORDER_CONFIRMED: 'Order Confirmed',
  ORDER_PREPARING: 'Preparing',
  ORDER_READY: 'Ready for Pickup',
  ORDER_OUT_FOR_DELIVERY: 'Out for Delivery',
  ORDER_DELIVERED: 'Delivered',
  ORDER_CANCELLED: 'Cancelled',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_FAILED: 'Payment Failed',
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function OrderTimeline({ logs, liveEvents = [] }: Props) {
  // Merge and deduplicate
  const allLogs = [...logs];
  for (const ev of liveEvents) {
    if (!allLogs.some(l => l.id === ev.id)) {
      allLogs.push(ev);
    }
  }

  // Sort chronologically
  allLogs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  if (allLogs.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No audit events yet</p>
      </div>
    );
  }

  return (
    <div className="order-timeline">
      {allLogs.map((log, index) => {
        const isLive = liveEvents.some(e => e.id === log.id);
        const isLast = index === allLogs.length - 1;

        return (
          <div
            key={log.id || index}
            className={`timeline-item ${isLast ? 'timeline-item--active' : ''} ${isLive ? 'timeline-item--live' : ''}`}
          >
            <div className="timeline-item__line">
              <div className="timeline-item__icon">
                <UiIcon name={eventIcons[log.eventType] || 'receipt'} className="timeline-item__svg" />
              </div>
              {!isLast && <div className="timeline-item__connector" />}
            </div>
            <div className="timeline-item__content">
              <div className="timeline-item__header">
                <span className="timeline-item__label">
                  {eventLabels[log.eventType] || log.eventType}
                </span>
                {isLive && <span className="timeline-item__live-badge">LIVE</span>}
              </div>
              <div className="timeline-item__meta">
                <span className="timeline-item__time">{formatTime(log.createdAt)}</span>
                {log.fromStatus && log.toStatus && log.fromStatus !== log.toStatus && (
                  <span className="timeline-item__transition">
                    {log.fromStatus} → {log.toStatus}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
