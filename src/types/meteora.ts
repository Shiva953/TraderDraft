/**
 * Meteora DEX price API types
 */

export interface MeteoraPoolInfo {
  pool_address: string;
  token_a_mint: string;
  token_b_mint: string;
  current_price: number;
  price_24h_ago?: number;
  volume_24h?: number;
  liquidity_usd?: number;
  price_change_24h?: number;
  token_a_reserve?: number;
  token_b_reserve?: number;
}

export interface TokenPriceData {
  price: number;
  priceChange24h: number;
  priceChange24hPercent: number;
  volume24h?: number;
  liquidityUsd?: number;
  totalSupply?: number;
  marketCap?: number;
}