/**
 * Centralized type exports for TraderDraft
 *
 * Import from this file to access all type definitions:
 * import { KolData, UserPacksData, ... } from '@/types';
 */

// Re-export all types for convenient imports
export * from "./database";
export * from "./kol";
export * from "./pack";
export * from "./user";
export * from "./transaction";
export * from "./api";
export * from "./meteora";
export * from "./scraper";
export * from "./components";

// Type utilities
export type Prettify<T> = { [K in keyof T]: T[K] } & {};