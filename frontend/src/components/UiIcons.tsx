import type { ReactElement } from 'react';

type IconName =
  | 'dashboard'
  | 'restaurant'
  | 'cart'
  | 'orders'
  | 'history'
  | 'logout'
  | 'delivery'
  | 'package'
  | 'receipt'
  | 'clock'
  | 'check'
  | 'chef'
  | 'location'
  | 'customer'
  | 'wallet'
  | 'spark'
  | 'search';

interface Props {
  name: IconName;
  className?: string;
}

const iconPaths: Record<IconName, ReactElement> = {
  dashboard: <path d="M4 11.5V5.75A1.75 1.75 0 0 1 5.75 4h4.5v7.5H4Zm0 8.5v-5.25h6.25V20H5.75A1.75 1.75 0 0 1 4 18.5Zm8.25 1.5V4h6A1.75 1.75 0 0 1 20 5.75v13.5A1.75 1.75 0 0 1 18.25 21h-6Z" />,
  restaurant: <path d="M6 4v7m4-7v7m4-7v7M6 11c0 1.657-1 3-2 3v7h16v-7c-1 0-2-1.343-2-3M4 11h16" />,
  cart: <path d="M5 6h15l-1.4 7.2a2 2 0 0 1-2 1.6H8.1a2 2 0 0 1-1.96-1.56L5 6Zm3.5 13a1.25 1.25 0 1 0 0-2.5A1.25 1.25 0 0 0 8.5 19Zm8 0a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z" />,
  orders: <path d="M7 4h10v4H7V4Zm-2 6h14v10H5V10Zm3 2h8m-8 3h5" />,
  history: <path d="M5 12a7 7 0 1 1 2.05 4.95M5 12H2m3 0v3m7-7v4l3 2" />,
  logout: <path d="M10 17l-1 4h9a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H9l1 4m-1 6h7m0 0-3-3m3 3-3 3" />,
  delivery: <path d="M3 7h10v7H3V7Zm10 2h4l4 4v1h-8V9Zm-9 8a2 2 0 1 0 0 .01V17Zm12 0a2 2 0 1 0 0 .01V17" />,
  package: <path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Zm8-3.5v9m0 0L4 9.5m8 3 8-3" />,
  receipt: <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21V3Zm3 4h6m-6 4h6m-6 4h4" />,
  clock: <path d="M12 7v5l3 2m7-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  chef: <path d="M8 9a4 4 0 1 1 8 0v1h1.5a2.5 2.5 0 0 1 2.5 2.5V15H4v-2.5A2.5 2.5 0 0 1 6.5 10H8V9Zm0 6h8v6H8v-6Z" />,
  location: <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Zm0-8.5A2.5 2.5 0 1 1 12 8a2.5 2.5 0 0 1 0 4.5Z" />,
  customer: <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0" />,
  wallet: <path d="M5 7h14v10H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm14 4h2v4h-2v-4Z" />,
  spark: <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Zm7 11 1 2.8 2.8 1-2.8 1L19 20l-1-2.8-2.8-1 2.8-1 1-2.2Z" />,
  search: <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L20 20" />,
};

export function UiIcon({ name, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {iconPaths[name]}
    </svg>
  );
}