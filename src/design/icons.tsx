/**
 * Icon wrapper around lucide-react.
 *
 * Adds centralized size tokens (sm=14, md=16, lg=20, xl=24) and the
 * `<Icon name="..." size="md" />` indirection so callers don't import lucide
 * directly. Add new icons to ICON_MAP below as you need them.
 *
 * NOTE: requires `npm install lucide-react`.
 */

import {
  Activity,
  AlertTriangle,
  Bell,
  Bot,
  Brain,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  Command as CommandIcon,
  Cpu,
  Database,
  DollarSign,
  FileCode,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mic,
  Network,
  Package,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Terminal,
  TestTube2,
  User as UserIcon,
  Wrench,
  X as XIcon,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP = {
  activity: Activity,
  alert: AlertTriangle,
  bell: Bell,
  bot: Bot,
  brain: Brain,
  brainCircuit: BrainCircuit,
  check: CheckCircle2,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  circleDot: CircleDot,
  code: Code2,
  command: CommandIcon,
  cpu: Cpu,
  database: Database,
  dollar: DollarSign,
  fileCode: FileCode,
  fileText: FileText,
  globe: Globe,
  history: History,
  grid: LayoutGrid,
  layoutDashboard: LayoutDashboard,
  logout: LogOut,
  mic: Mic,
  network: Network,
  package: Package,
  play: Play,
  plus: Plus,
  search: Search,
  settings: Settings,
  shield: Shield,
  sparkles: Sparkles,
  terminal: Terminal,
  test: TestTube2,
  user: UserIcon,
  wrench: Wrench,
  x: XIcon,
  zap: Zap,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_SIZES = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({
  name,
  size = 'md',
  color,
  strokeWidth = 2,
  className,
  style,
}: IconProps) {
  const Cmp = ICON_MAP[name];
  const px = typeof size === 'number' ? size : ICON_SIZES[size];
  return (
    <Cmp
      size={px}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
    />
  );
}
