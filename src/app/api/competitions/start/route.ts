// // FOR PROD(COMPETITION WINDOWS: [MON-THU, THU-SUN], RUN 2X MON AND THU 0:00 BG JOBS)

// import { NextRequest, NextResponse } from 'next/server';
// import prisma from "@/lib/prisma";

// const prisma = new PrismaClient();

// export async function POST(request: NextRequest) {
//   try {
//     // Get current date in UTC
//     const now = new Date();
    
//     // Calculate start date (current Monday or next Monday if called on weekend)
//     const startDate = getNextMonday(now);
    
//     // Calculate end date (Friday of the same week at 23:59:59 UTC)
//     const endDate = new Date(startDate);
//     endDate.setDate(startDate.getDate() + 4); // Add 4 days to get Friday
//     endDate.setHours(23, 59, 59, 999); // Set to end of Friday
    
//     // Check if a competition already exists for this week
//     const existingCompetition = await prisma.competition.findFirst({
//       where: {
//         startDate: {
//           gte: startDate,
//           lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000) // Same day
//         },
//         status: {
//           in: ['ACTIVE', 'ENDED'] // Don't create if there's already an active or ended competition for this week
//         }
//       }
//     });

//     if (existingCompetition) {
//       return NextResponse.json(
//         { 
//           error: 'Competition already exists for this week',
//           competitionId: existingCompetition.id,
//           startDate: existingCompetition.startDate,
//           endDate: existingCompetition.endDate
//         },
//         { status: 409 }
//       );
//     }

//     // Create new competition
//     const competition = await prisma.competition.create({
//       data: {
//         startDate,
//         endDate,
//         status: 'ACTIVE',
//         tpPool: 10000, // Default TP pool as specified in schema
//       }
//     });

//     // Log the creation for monitoring
//     console.log(`New competition created: ${competition.id}`, {
//       startDate: competition.startDate.toISOString(),
//       endDate: competition.endDate.toISOString(),
//       tpPool: competition.tpPool.toString()
//     });

//     return NextResponse.json({
//       success: true,
//       competition: {
//         id: competition.id,
//         startDate: competition.startDate.toISOString(),
//         endDate: competition.endDate.toISOString(),
//         status: competition.status,
//         tpPool: competition.tpPool.toString()
//       }
//     }, { status: 201 });

//   } catch (error) {
//     console.error('Error creating competition:', error);
//     return NextResponse.json(
//       { error: 'Failed to create competition' },
//       { status: 500 }
//     );
//   }
// }

// /**
//  * Get the next Monday date (or current date if it's already Monday)
//  * @param date - Current date
//  * @returns Date object for the Monday of current/next week
//  */
// function getNextMonday(date: Date): Date {
//   const monday = new Date(date);
//   const dayOfWeek = monday.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
//   if (dayOfWeek === 1) {
//     // If today is Monday, use today
//     monday.setUTCHours(0, 0, 0, 0);
//     return monday;
//   } else {
//     // Calculate days until next Monday
//     const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
//     monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
//     monday.setUTCHours(0, 0, 0, 0);
//     return monday;
//   }
// }

// // Optional: GET endpoint to check current active competition
// export async function GET(request: NextRequest) {
//   try {
//     const currentCompetition = await prisma.competition.findFirst({
//       where: {
//         status: 'ACTIVE',
//         startDate: {
//           lte: new Date()
//         },
//         endDate: {
//           gte: new Date()
//         }
//       },
//       orderBy: {
//         startDate: 'desc'
//       }
//     });

//     if (!currentCompetition) {
//       return NextResponse.json({
//         success: true,
//         competition: null,
//         message: 'No active competition found'
//       });
//     }

//     return NextResponse.json({
//       success: true,
//       competition: {
//         id: currentCompetition.id,
//         startDate: currentCompetition.startDate.toISOString(),
//         endDate: currentCompetition.endDate.toISOString(),
//         status: currentCompetition.status,
//         tpPool: currentCompetition.tpPool.toString()
//       }
//     });

//   } catch (error) {
//     console.error('Error fetching current competition:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch current competition' },
//       { status: 500 }
//     );
//   }
// }

// FOR TESTING(COMPETITION LASTS 10 MINUTES)
import { NextRequest, NextResponse } from 'next/server';
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const now = new Date();

    console.log(`🟡 [START] Attempting to start competition at ${now.toISOString()}`);

    // STRICT CHECK: Ensure NO ACTIVE competitions exist
    const activeCompetition = await prisma.competition.findFirst({
      where: {
        status: 'ACTIVE'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (activeCompetition) {
      console.warn(`❌ [START] Cannot start - Active competition already exists: ${activeCompetition.id} (status: ${activeCompetition.status})`);
      return NextResponse.json(
        {
          error: 'Active competition already exists',
          competitionId: activeCompetition.id,
          startDate: activeCompetition.startDate,
          endDate: activeCompetition.endDate,
          status: activeCompetition.status
        },
        { status: 409 }
      );
    }

    // FOR TESTING: Create 10-minute competition
    // FOR PRODUCTION: Use getNextMonday logic
    const startDate = new Date(now);
    const endDate = new Date(now);
    endDate.setMinutes(endDate.getMinutes() + 10); // 10 minutes for testing

    // Create new competition
    const competition = await prisma.competition.create({
      data: {
        startDate,
        endDate,
        status: 'ACTIVE',
        tpPool: 10000,
      }
    });

    console.log(`✅ [START] New competition created: ${competition.id}`, {
      startDate: competition.startDate.toISOString(),
      endDate: competition.endDate.toISOString(),
      status: competition.status,
      duration: '10 minutes',
      tpPool: competition.tpPool.toString()
    });

    return NextResponse.json({
      success: true,
      competition: {
        id: competition.id,
        startDate: competition.startDate.toISOString(),
        endDate: competition.endDate.toISOString(),
        status: competition.status,
        tpPool: competition.tpPool.toString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error('❌ [START] Error creating competition:', error);
    return NextResponse.json(
      { error: 'Failed to create competition' },
      { status: 500 }
    );
  }
}

// GET endpoint to check current active competition
export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    
    // First, try to find an ACTIVE competition (even if expired - needs finalization)
    const activeCompetition = await prisma.competition.findFirst({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    // If we found an ACTIVE competition, return it regardless of end time
    // The cron job will handle finalization if it's past the end time
    if (activeCompetition) {
      return NextResponse.json({
        success: true,
        competition: {
          id: activeCompetition.id,
          startDate: activeCompetition.startDate.toISOString(),
          endDate: activeCompetition.endDate.toISOString(),
          status: activeCompetition.status,
          tpPool: activeCompetition.tpPool.toString()
        }
      });
    }

    // No active competition found
    return NextResponse.json({
      success: true,
      competition: null,
      message: 'No active competition found'
    });

  } catch (error) {
    console.error('Error fetching current competition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current competition' },
      { status: 500 }
    );
  }
}

/**
 * PRODUCTION VERSION - Get the next Monday date
 * Uncomment this and update POST logic for production use
 */
// function getNextMonday(date: Date): Date {
//   const monday = new Date(date);
//   const dayOfWeek = monday.getUTCDay();
//   
//   if (dayOfWeek === 1) {
//     monday.setUTCHours(0, 0, 0, 0);
//     return monday;
//   } else {
//     const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
//     monday.setUTCDate(monday.getUTCDate() + daysUntilMonday);
//     monday.setUTCHours(0, 0, 0, 0);
//     return monday;
//   }
// }
//
// PRODUCTION POST LOGIC:
// const startDate = getNextMonday(now);
// const endDate = new Date(startDate);
// endDate.setDate(startDate.getDate() + 4);
// endDate.setHours(23, 59, 59, 999);