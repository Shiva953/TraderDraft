import { useState, useCallback } from 'react';
import { useSolanaWallets } from "@privy-io/react-auth";
import type { OrderRecord, OrdersResponse } from '@/types';

export const useOrders = () => {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();

  const fetchOrders = useCallback(async () => {
    if (!wallets || wallets.length === 0) {
      setError("No wallet connected");
      return;
    }

    const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");
    if (!embeddedWallet) {
      setError("No embedded wallet found");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/getOrders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userPrivyWalletAddress: embeddedWallet.address,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: OrdersResponse = await response.json();
      
      if (data.success) {
        setOrders(data.data);
      } else {
        throw new Error(data.error || "Failed to fetch orders");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch orders";
      setError(errorMessage);
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, [wallets]);

  const totalPacks = orders.reduce((sum, order) => sum + order.packsBought, 0);
  const totalValue = orders.reduce((sum, order) => sum + Number(order.totalValue), 0);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    totalPacks,
    totalValue,
  };
};