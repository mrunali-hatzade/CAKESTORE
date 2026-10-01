import React from 'react';
import { Badge, BadgeProps } from '@/components/ui/Badge';

export type DomainStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'IN_STOCK'
  | 'OUT_OF_STOCK';

interface StatusBadgeProps {
  status: DomainStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', className }) => {
  const getBadgeConfig = (st: string): { label: string; variant: BadgeProps['variant'] } => {
    switch (st.toUpperCase()) {
      case 'DELIVERED':
      case 'COMPLETED':
      case 'ACTIVE':
      case 'IN_STOCK':
        return { label: st.replace(/_/g, ' '), variant: 'success' };
      case 'CONFIRMED':
      case 'READY':
      case 'READY_FOR_PICKUP':
        return { label: st.replace(/_/g, ' '), variant: 'info' };
      case 'PREPARING':
      case 'OUT_FOR_DELIVERY':
      case 'NEW':
      case 'PENDING':
        return { label: st.replace(/_/g, ' '), variant: 'warning' };
      case 'CANCELLED':
      case 'SUSPENDED':
      case 'REJECTED':
      case 'OUT_OF_STOCK':
        return { label: st.replace(/_/g, ' '), variant: 'error' };
      default:
        return { label: st.replace(/_/g, ' '), variant: 'default' };
    }
  };

  const { label, variant } = getBadgeConfig(status);

  return (
    <Badge variant={variant} size={size} className={className}>
      {label}
    </Badge>
  );
};
