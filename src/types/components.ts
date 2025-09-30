/**
 * React component prop types
 */

import type { LeaderboardEntry } from "./kol";
import type { UserPacksData, TokenHolding } from "./user";

// Modal Props
export interface ViewOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface TokenHoldingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenHoldings: TokenHolding[];
}

// Profile Component Props
export interface UserProfileDropDownMenuProps {
  authenticated: boolean;
  packs: UserPacksData | null;
  tokenHoldings: TokenHolding[];
  tokenHoldingsCount: number;
  loading: boolean;
  refreshUserData: () => void;
}

export interface UserProfilePictureProps {
  authenticated: boolean;
  packs: UserPacksData | null;
  tokenHoldings: TokenHolding[];
  tokenHoldingsCount: number;
  loading: boolean;
}

// Leaderboard Props
export interface LeaderboardProps {
  title?: string;
  entries: LeaderboardEntry[];
  loading?: boolean;
}

// Pack Sale Props
export interface BuyPackButtonProps {
  packCount: number;
  totalPrice: number;
  onSuccess?: () => void;
}

export interface BuyPackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CompetitionBannerProps {
  competitionId?: string;
  status?: string;
}