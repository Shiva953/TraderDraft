// Stats Summary Component
import { MultiPackRevealResponse } from "./MultiPackKOLGrid"

export const StatsSummary = ({ stats }: { stats: MultiPackRevealResponse['data']['stats'] }) => {
    return (
      <div className="rounded-xl p-6 mb-6 border border-gray-700">
        <h3 className="text-white text-2xl font-semibold mb-4 text-center">KOL Packs</h3>
        <div className="flex justify-center ml-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.totalPacksRevealed}</div>
              <div className="text-sm text-gray-400">Packs Opened</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.totalUniqueKols}</div>
              <div className="text-sm text-gray-400">Unique KOLs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.avgWinRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Avg Win Rate</div>
            </div>
          </div>
        </div>
        
        {/* {stats.duplicateRate > 0 && (
          <div className="mt-4 p-3 bg-gray-800 border border-gray-600 rounded-lg">
            <div className="text-gray-300 text-sm text-center">
              <strong>Consolidation Bonus:</strong> {stats.duplicateRate.toFixed(1)}% of your cards were duplicates, 
              giving you extra tokens for those KOLs!
            </div>
          </div>
        )} */}
      </div>
    )
  }