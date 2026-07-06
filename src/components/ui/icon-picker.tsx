// =============================================================================
// src/components/ui/icon-picker.tsx — Searchable Lucide icon picker
// =============================================================================
// An inline popover-based icon picker that lets users search and select from
// a curated set of Lucide icons. Shows a preview of the selected icon.
// =============================================================================

'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Curated icon list — common icons useful for queue/service management
// ---------------------------------------------------------------------------

const ICON_NAMES = [
  // ── Queue & Tickets ──
  'Ticket', 'TicketCheck', 'ClipboardList', 'ListChecks', 'Hash',
  'Clock', 'Timer', 'Calendar', 'AlarmClock', 'RotateCcw',
  'ArrowRight', 'ArrowLeft', 'ChevronRight', 'ChevronLeft',

  // ── People & Roles ──
  'Users', 'User', 'UserCheck', 'UserPlus', 'UserX', 'UserCircle',
  'UserRound', 'Contact', 'IdCard', 'PersonStanding', 'Baby',
  'Accessibility', 'ShieldCheck', 'ShieldAlert', 'ShieldX',
  'LogIn', 'LogOut', 'Fingerprint', 'ScanFace',

  // ── Counters & Service Points ──
  'Monitor', 'Tablet', 'LayoutDashboard', 'DoorOpen', 'DoorClosed',
  'Landmark', 'Building', 'Building2', 'Briefcase', 'MapPin',
  'Navigation', 'Compass',

  // ── Medical & Health ──
  'HeartPulse', 'Stethoscope', 'Thermometer', 'Pill', 'Syringe',
  'Activity', 'Bandage', 'Cross', 'Eye', 'Ear',
  'Droplet', 'Siren', 'HandHelping', 'Heart',

  // ── Documents & Data ──
  'FileText', 'File', 'Clipboard', 'BookOpen', 'Book',
  'BarChart3', 'PieChart', 'LineChart', 'TrendingUp', 'TrendingDown',
  'Database', 'Folder', 'Archive', 'Save', 'Download', 'Upload',
  'Printer', 'QrCode', 'Scan', 'FormInput',

  // ── Communication ──
  'Mail', 'MessageSquare', 'MessageCircle', 'Phone', 'Headphones',
  'Megaphone', 'Bell', 'Volume2', 'Mic', 'Share',

  // ── Tech & Digital ──
  'Smartphone', 'Laptop', 'Wifi', 'Bluetooth', 'Router',
  'Camera', 'Video', 'Image', 'Film', 'Music', 'Gamepad2',
  'Cloud', 'Globe', 'Link', 'Server', 'Workflow', 'Waypoints', 'Network',

  // ── Admin & Settings ──
  'Settings', 'Cog', 'Wrench', 'Key', 'KeyRound', 'Lock', 'Unlock',
  'LockKeyhole', 'CreditCard', 'Receipt', 'Wallet', 'Calculator',

  // ── Actions & Status ──
  'Plus', 'X', 'Check', 'CheckCircle', 'XCircle', 'CircleCheck', 'CircleX',
  'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle',
  'Circle', 'CircleDot', 'Loader2', 'Pencil', 'Trash2', 'Copy', 'Search',
  'RefreshCw', 'RotateCw',

  // ── Food & Hospitality ──
  'Utensils', 'Coffee', 'Cake', 'Cherry', 'Hotel', 'BedDouble', 'Dumbbell',

  // ── Transport & Logistics ──
  'ShoppingCart', 'ShoppingBag', 'Store', 'Truck', 'Package',
  'Car', 'Bus', 'Plane', 'Ship', 'Bike',

  // ── Nature & Misc ──
  'TreePine', 'Flower2', 'Sun', 'Moon', 'Mountain',
  'Flame', 'Leaf', 'Sparkles', 'Star', 'Zap',
  'Award', 'Badge', 'Gift', 'Gem', 'Crown', 'Shield',
  'Tag', 'Flag', 'Bookmark', 'Layers', 'Layout',
  'Grid3x3', 'List', 'Maximize', 'Minimize',

  // ── Education ──
  'GraduationCap', 'School', 'Library', 'Pen', 'Palette',
  'Brush', 'Scissors', 'Ruler', 'Type',
] as const;

// Deduplicate
const UNIQUE_ICON_NAMES = [...new Set(ICON_NAMES)] as string[];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function resolveIcon(name: string): LucideIcon | null {
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (icon && (typeof icon === 'function' || typeof icon === 'object')) return icon as LucideIcon;
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  className?: string;
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const SelectedIcon = value ? resolveIcon(value) : null;

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return UNIQUE_ICON_NAMES;
    const q = search.toLowerCase();
    return UNIQUE_ICON_NAMES.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const handleSelect = useCallback(
    (name: string, e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      onChange(name);
      setOpen(false);
      setSearch('');
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    onChange('');
    setSearch('');
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      // Small delay to let the dropdown render
      const t = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      {/* Trigger button — shows selected icon or placeholder */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-accent"
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="size-4" />
              <span>{value}</span>
            </>
          ) : (
            <>
              <LucideIcons.HelpCircle className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Choose icon…</span>
            </>
          )}
          <ChevronDown className="ml-1 size-3.5 text-muted-foreground" />
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[320px] rounded-lg border border-border bg-popover p-3 shadow-lg">
          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="h-8 pl-8 text-sm"
            />
          </div>

          {/* Icon grid */}
          <div className="grid max-h-[280px] grid-cols-8 gap-0.5 overflow-y-auto">
            {filteredIcons.map((name) => {
              const Icon = resolveIcon(name);
              if (!Icon) return null;
              const isSelected = name === value;
              return (
                <button
                  key={name}
                  type="button"
                  title={name}
                  onClick={(e) => handleSelect(name, e)}
                  className={`flex aspect-square items-center justify-center rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="size-4.5" />
                </button>
              );
            })}
          </div>

          {filteredIcons.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No icons found for &quot;{search}&quot;
            </p>
          )}

          {/* Footer: selected + manual input */}
          <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
            <span className="text-xs text-muted-foreground">Selected:</span>
            {SelectedIcon ? (
              <span className="flex items-center gap-1 text-xs font-medium">
                <SelectedIcon className="size-3.5" />
                {value}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
            <div className="ml-auto flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-6 w-24 rounded border border-input bg-background px-1.5 text-xs"
                placeholder="IconName"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
