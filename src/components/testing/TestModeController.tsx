'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Play, Square, Camera, Trophy, HelpCircle, RefreshCw } from 'lucide-react';

interface TestStatus {
  hasActive: boolean;
  competition: {
    id: string;
    startDate: string;
    endDate: string;
    status: string;
    timeRemaining: number;
  } | null;
  lastFinalized: {
    id: string;
    endDate: string;
    finalizedAt: string;
  } | null;
  timeUntilNextAllowed: number;
  config: {
    competitionDurationMs: number;
    snapshotIntervalMs: number;
    postFinalizationGapMs: number;
  };
}

export default function TestModeController() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<TestStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [autoSnapshotInterval, setAutoSnapshotInterval] = useState<NodeJS.Timeout | null>(null);
  const [autoFinalizeTimeout, setAutoFinalizeTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    // Setup auto-snapshot and auto-finalize when competition is active
    if (status?.hasActive && status.competition) {
      const timeRemaining = status.competition.timeRemaining;
      const snapshotInterval = status.config.snapshotIntervalMs;

      // Clear existing timers
      if (autoSnapshotInterval) clearInterval(autoSnapshotInterval);
      if (autoFinalizeTimeout) clearTimeout(autoFinalizeTimeout);

      // Setup auto-snapshots
      const snapInterval = setInterval(async () => {
        await takeSnapshot(true);
      }, snapshotInterval);
      setAutoSnapshotInterval(snapInterval);

      // Setup auto-finalize at end time
      let finalizeTimeout: NodeJS.Timeout | null = null;
      if (timeRemaining > 0) {
        finalizeTimeout = setTimeout(async () => {
          await finalizeCompetition(true);
        }, timeRemaining);
        setAutoFinalizeTimeout(finalizeTimeout);
      }

      return () => {
        clearInterval(snapInterval);
        if (finalizeTimeout) clearTimeout(finalizeTimeout);
      };
    } else {
      // Clean up timers when no active competition
      if (autoSnapshotInterval) clearInterval(autoSnapshotInterval);
      if (autoFinalizeTimeout) clearTimeout(autoFinalizeTimeout);
    }
  }, [status?.hasActive, status?.competition?.id]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/test-mode');
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch test status:', error);
    }
  };

  const startCompetition = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('🏁 Test Competition Started!', {
          description: `Duration: 10 minutes | Snapshots every 2 minutes`,
          duration: 5000,
        });
        await fetchStatus();
      } else {
        toast.error('Failed to start competition', {
          description: data.error || data.message || 'Unknown error'
        });
      }
    } catch (error) {
      toast.error('Error starting competition', {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  };

  const takeSnapshot = async (isAuto = false) => {
    // Show loading toast for manual snapshots
    let loadingToastId: string | number | undefined;
    if (!isAuto) {
      loadingToastId = toast.loading('📸 Taking snapshot...', {
        description: 'Calculating scores...'
      });
    }

    try {
      const response = await fetch('/api/test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'snapshot' })
      });

      const data = await response.json();

      // Dismiss loading toast
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }

      if (response.ok) {
        toast.success('📸 Daily Score Snapshot Taken!', {
          description: isAuto ? 'Automatic snapshot - Refresh to see updated scores' : 'Manual snapshot - Check live scores for updates',
          duration: 8000,
        });
        await fetchStatus();
      } else {
        if (!isAuto) {
          toast.error('Snapshot failed', { description: data.error });
        }
      }
    } catch (error) {
      // Dismiss loading toast on error
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      if (!isAuto) {
        toast.error('Error taking snapshot');
      }
    }
  };

  const finalizeCompetition = async (isAuto = false) => {
    setIsLoading(true);

    // Show loading toast
    const loadingToastId = toast.loading('🏆 Finalizing competition...', {
      description: 'Calculating final results...'
    });

    try {
      const response = await fetch('/api/test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finalize' })
      });

      const data = await response.json();

      // Dismiss loading toast
      toast.dismiss(loadingToastId);

      if (response.ok) {
        toast.success('🏆 COMPETITION FINALIZED!', {
          description: '🎉 Refresh page to see winners and final results',
          duration: 12000,
          action: {
            label: 'Refresh',
            onClick: () => window.location.reload()
          }
        });
        await fetchStatus();
      } else {
        toast.error('Finalization failed', { description: data.error });
      }
    } catch (error) {
      // Dismiss loading toast on error
      toast.dismiss(loadingToastId);
      toast.error('Error finalizing competition');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
      >
        <Play className="w-4 h-4" />
        Test Mode
      </button>
    );
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl w-96 max-h-[600px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h3 className="font-bold text-white">Test Mode Controller</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
            >
              <HelpCircle className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded transition-colors cursor-pointer"
            >
              <Square className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Status Display */}
          <div className="bg-neutral-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Status</span>
              <button
                onClick={fetchStatus}
                className="p-1 hover:bg-neutral-700 rounded transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            {status?.hasActive ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 font-medium">Competition Active</span>
                </div>
                <div className="text-xs text-neutral-400 space-y-1">
                  <div>ID: {status.competition?.id.slice(0, 8)}...</div>
                  <div className="font-mono text-orange-400">
                    Time Remaining: {formatTime(status.competition?.timeRemaining || 0)}
                  </div>
                </div>
              </>
            ) : status?.timeUntilNextAllowed! > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-yellow-400 font-medium">Cooling Down</span>
                </div>
                <div className="text-xs text-neutral-400">
                  Next start in: {formatTime(status?.timeUntilNextAllowed || 0)}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neutral-500 rounded-full" />
                  <span className="text-neutral-400 font-medium">No Active Competition</span>
                </div>
                <div className="text-xs text-neutral-500">Ready to start</div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-2">
            <button
              onClick={startCompetition}
              disabled={isLoading || status?.hasActive || (status?.timeUntilNextAllowed || 0) > 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium cursor-pointer"
            >
              <Play className="w-5 h-5" />
              Start Test Competition (10min)
            </button>

            <button
              onClick={() => takeSnapshot(false)}
              disabled={isLoading || !status?.hasActive}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              Take Snapshot Now
            </button>

            <button
              onClick={() => finalizeCompetition(false)}
              disabled={isLoading || !status?.hasActive}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors font-medium cursor-pointer"
            >
              <Trophy className="w-5 h-5" />
              Finalize Now
            </button>
          </div>

          {/* Info */}
          <div className="bg-neutral-800 rounded-lg p-3 space-y-1 text-xs text-neutral-400">
            <div className="font-medium text-neutral-300 mb-2">Auto-Actions Enabled:</div>
            <div>✓ Snapshots every 2 minutes</div>
            <div>✓ Auto-finalize at 10 minutes</div>
            <div>✓ 1.5 min cooldown after finalize</div>
          </div>

          {status?.lastFinalized && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3 text-xs">
              <div className="text-green-400 font-medium mb-1">Last Finalized:</div>
              <div className="text-neutral-400">ID: {status.lastFinalized.id.slice(0, 8)}...</div>
              <div className="text-neutral-500">
                {new Date(status.lastFinalized.finalizedAt).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
              <h3 className="font-bold text-white text-lg">Testing Instructions</h3>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-white mb-2">🎯 How to Test Competitions</h4>
                <ol className="list-decimal list-inside space-y-2 text-neutral-300">
                  <li><strong>Start Competition:</strong> Click "Start Test Competition" to begin a 10-minute test window</li>
                  <li><strong>Buy KOL Tokens:</strong> Use the main app to buy KOL tokens during the competition</li>
                  <li><strong>Auto Snapshots:</strong> Scores update automatically every 2 minutes (watch for toast notifications)</li>
                  <li><strong>Manual Snapshot:</strong> Click "Take Snapshot Now" to trigger a score update anytime</li>
                  <li><strong>Finalization:</strong> Competition auto-finalizes after 10 minutes, or click "Finalize Now"</li>
                  <li><strong>View Results:</strong> After finalization, refresh the page to see winners</li>
                  <li><strong>Cooldown:</strong> Wait 1.5 minutes before starting the next test competition</li>
                </ol>
              </div>

              <div className="bg-neutral-800 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">⚡ Test vs Production Timeline</h4>
                <div className="space-y-1 text-neutral-300 text-xs">
                  <div className="flex justify-between">
                    <span>Competition Duration:</span>
                    <span><span className="text-purple-400">10 min</span> (vs 2.5 days)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Snapshot Interval:</span>
                    <span><span className="text-purple-400">2 min</span> (vs 14 hours)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Post-Finalize Gap:</span>
                    <span><span className="text-purple-400">1.5 min</span> (vs 12 hours)</span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-orange-400 mb-2">⚠️ Important Notes</h4>
                <ul className="list-disc list-inside space-y-1 text-neutral-300 text-xs">
                  <li>This is for TESTING ONLY - not visible to end users</li>
                  <li>Auto-actions run in the background (snapshots + finalization)</li>
                  <li>Toast notifications show when snapshots/finalization occur</li>
                  <li>All test data uses the same database as production</li>
                  <li>You can run multiple test cycles to validate the flow</li>
                </ul>
              </div>

              <button
                onClick={() => setShowHelp(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition-colors font-medium cursor-pointer"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
