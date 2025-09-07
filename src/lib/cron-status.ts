import { NextApiRequest, NextApiResponse } from 'next';
import cronManager from './cronJobs';
import { JobStatus } from './cronJobs';

interface ApiResponse {
  ok?: boolean;
  status?: JobStatus;
  message: string;
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ 
      message: 'Not available in production',
      error: 'Not found' 
    });
  }

  switch (req.method) {
    case 'GET':
      // Get status
      const status = cronManager.getStatus();
      return res.json({
        ok: true,
        status,
        message: 'Cron job status'
      });

    case 'POST':
      // Manual trigger
      try {
        await cronManager.triggerUpdate();
        return res.json({
          ok: true,
          message: 'Manual update triggered successfully'
        });
      } catch (error) {
        return res.status(500).json({
          error: 'Manual update failed',
          details: error instanceof Error ? error.message : 'Unknown error',
          message: 'Update failed'
        });
      }

    default:
      return res.status(405).json({ 
        error: 'Method not allowed',
        message: 'Method not allowed' 
      });
  }
}