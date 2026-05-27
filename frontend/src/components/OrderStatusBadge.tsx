import type { OrderStatus } from '../types';
import { UiIcon } from './UiIcons';
import './OrderStatusBadge.css';

interface Props {
  status: OrderStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { label: string; className: string; icon: 'clock' | 'check' | 'chef' | 'package' | 'delivery' | 'spark' | 'customer' }> = {
  PENDING: { label: 'Pending', className: 'badge--pending', icon: 'clock' },
  CONFIRMED: { label: 'Confirmed', className: 'badge--confirmed', icon: 'check' },
  PREPARING: { label: 'Preparing', className: 'badge--preparing', icon: 'chef' },
  READY: { label: 'Ready', className: 'badge--ready', icon: 'package' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', className: 'badge--delivery', icon: 'delivery' },
  DELIVERED: { label: 'Delivered', className: 'badge--delivered', icon: 'spark' },
  CANCELLED: { label: 'Cancelled', className: 'badge--cancelled', icon: 'customer' },
};

export default function OrderStatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status] || { label: status, className: 'badge--default' };

  return (
    <span className={`order-badge order-badge--${size} ${config.className}`}>
      <span className="order-badge__icon" aria-hidden="true">
        <UiIcon name={config.icon} className="order-badge__svg" />
      </span>
      {config.label}
    </span>
  );
}
