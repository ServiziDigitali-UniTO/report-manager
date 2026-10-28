import React from 'react';
import { ResourceCategoryKey } from '../types';
import { RESOURCE_CATEGORIES, categorizeResource } from '../utils/csvParser';

interface ResourceCategoryBadgeProps {
  categoryKey?: ResourceCategoryKey;
  resourceName?: string;
  showIcon?: boolean;
  className?: string;
}

export const ResourceCategoryBadge: React.FC<ResourceCategoryBadgeProps> = ({
  categoryKey,
  resourceName,
  className = '',
}) => {
  const key = categoryKey || (resourceName ? categorizeResource(resourceName) : 'ospedale');
  const cat = RESOURCE_CATEGORIES[key] || RESOURCE_CATEGORIES.ospedale;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cat.badgeBg} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
      <span>{resourceName || cat.label}</span>
    </span>
  );
};
