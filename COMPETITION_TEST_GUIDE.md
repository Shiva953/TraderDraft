# COMPETITION SYSTEM FINAL TEST

---

## Overview

Here is the full competition and points system implementation with apt starts, defined window, period snapshots and finalizing after fixed time.

---

## Main App Flow (Production)

**Competition Schedule:** Monday 00:00 UTC → Wednesday 12:00 UTC (2.5 days)

### Timeline

**Monday 00:00 UTC**
- Competition starts automatically (via Google Cloud Scheduler cron job)
- Competition banner goes live on front page
- Users can start buying KOL tokens
- Users auto-join competition on first token purchase

**Monday 14:00 UTC (Snapshot #1)**
- Background cron job triggers daily score calculation
- All user scores updated based on KOL holdings and PnL
- Scores visible in "View Live Scores" modal

**Tuesday 14:00 UTC (Snapshot #2)**
- Second daily score snapshot
- User scores recalculated and updated
- New token purchases after previous snapshot count toward this epoch

**Wednesday 12:00 PM UTC (Competition Ends)**
- Competition status changes to FINALIZED
- Final tournament points (TP) calculated and distributed
- Winners announced on front page
- Users can claim packs based on TP earned

**Wednesday 12:00 PM - Thursday 00:00 AM UTC (Cooldown Period - 12 hours)**
- Results displayed on front page
- Users can open packs and view leaderboard
- No active competition during this period

**Thursday 00:00 UTC**
- New competition cycle begins
- Process repeats

### Key Configuration (Production)
- **Competition Duration:** 60 hours (2.5 days)
- **Snapshot Interval:** 14 hours (daily at 14:00 UTC)
- **Total Snapshots:** 2 per competition
- **Post-Finalization Gap:** 12 hours
- **TP Pool per Competition:** 10,000 TP

---

## Test Mode Flow (Demo Video Walkthrough)

**For testing convenience:** 10 min competition window, 2 min snapshots, auto-finalized after 10 min

[FOR THIS VIDEO WE'VE BOUGHT THE TOKENS ONLY ONCE USING 3 DIFF ACCOUNTS BUT YOU CAN TRY TO BUY DIFF TOKENS USING ONE ACCOUNT - THE SCORES WILL GET UPDATED ACCORDINGLY AT SNAPSHOTS]

### Video Timeline

**0:00** - Starting the cron jobs from script
**0:14** - Running Competition Banner visible on front page
**0:16** - Check profile for TP (At 0 initially)

**0:26** - Starting first KOL Token buy for this competition
          - Participating from 1st Account (User `9x3JXz…`)

**0:46** - After swap (buy) confirmation, user gets auto-added to the competition
          - Proof shown in toast notification

**1:02** - Viewing Live Scores modal
          - Score is still 0 for the user because it's computed at periodic snapshots
          - Will remain gray until next snapshot

**1:09** - Participating in the SAME COMPETITION with 2nd Account (User `8TBLGx…`)

**1:20** - Buying a KOL token again, but with the 2nd account

**1:50** - **SNAPSHOT #1** [DAILY SCORES GET UPDATED FOR EACH USER]

**1:58** - Confirming score updates by viewing daily scores again
          - Now they're non-zero based on KOL token holdings and PnL
          - See MATH section to check how it's calculated
          - These daily scores will be used for calculating TP in the end

**2:18** - Testing from ACCOUNT #3 [User `2XVaJy…`]
          - (FAST FORWARDED - doing the same thing)

**2:48** - Final Live Scores Snapshot (including the 3rd user score)

**3:38** - **10 MIN WINDOW ENDS, COMPETITION GETS FINALIZED**

**3:40** - FRONT PAGE NOW SHOWS RESULTS

**3:46** - `Reveal Winners` shows the top 3 winners along with TP earned for the user
          - Option to check the full leaderboard

**3:56** - Leaderboard view
          - Shows all users, their ranks and TP for the last finalized competition

**4:20** - User TP gets updated in their profile as it should be

**4:22** - `Open Your Packs` allows you to reveal N packs as per your TP
          - Options to choose amount of pro/legendary/epic packs

**4:28** - KOL Cards Revealed
          - **TOKENS ARE AUTO CLAIMED TO YOUR PRIVY WALLET**
          - **REVEALING + CLAIMING HAPPENS AT ONCE**

**5:06** - Viewing KOL Holdings

---

## [TEST MODE] - How to Test Yourself

⚠️ **ALL FUNDS ARE ON DEVNET**

Now for you to test it and verify things yourself, I've added a test mode equivalent for the same (10 min window, 2 min snapshots, option to finalize/end the competition anytime you want and take snapshots anytime).

### Step-by-Step Testing Instructions

1. **Login & Fund Wallet**
   - Login using Privy
   - Fund your wallet with devnet SOL

2. **Start Competition**
   - Click on **"Test Mode"** (bottom right corner of the screen)
   - Click on **"Start Competition"** (Will start a fresh new competition)
   - Refresh the page

3. **Verify Competition Started**
   - You see "Running Competition" banner on front page

4. **Buy KOL Tokens**
   - Scroll down for the KOL leaderboard
   - Click on any KOL you want → click on the "Buy" option
   - KOL profile page opens
   - Click on "Buy Shares" and buy as many tokens you want (as per SOL balance)
   - After first buy, you're added to the competition by default

5. **Monitor Snapshots**
   - Go back to main page
   - Snapshot will be auto-taken after regular time (~2 mins)
   - **Important:** Just stay on the main page and don't refresh
     - (This wouldn't be the case for Mon-Wed duration window because there we will run Google Scheduler cron jobs that would be background running; here just for testing purpose we use default node intervals)

6. **Manual Snapshot (Optional)**
   - Can click on "Take Snapshot" to check for yourself that the snapshot thing is working
   - You'll see a toast notification
   - Can go to the "View Live Scores" button to see the updated scores

7. **Competition Finalization**
   - After competition duration ends (10 min), refresh the page
   - Now you can see the results for the last finalized competition and leaderboard
   - Along with an option to open packs with whatever TP you've earned

### Test Mode Configuration
- **Competition Duration:** 10 minutes
- **Snapshot Interval:** 2 minutes
- **Auto-Finalize:** After 10 minutes
- **Post-Finalization Gap:** 1.5 minutes
- **TP Pool:** 10,000 TP (same as production)

---

## MATH

### Competition Scoring System

Let **TP_POOL** be the given TP to be distributed among participants for a given competition.

**TP_POOL = 10,000** (constant for all competitions)

---

### Daily Score Calculation (At Each Snapshot)

For each snapshot, we calculate the **Daily Score** for every user based on their **ACTUAL on-chain token holdings**.

**IMPORTANT:** The system counts **ALL KOL tokens** a user holds at the time of the snapshot, regardless of when they were acquired. This means:
- ✅ Tokens purchased before the competition starts count
- ✅ Tokens purchased during the competition count
- ✅ Users holding tokens are **auto-enrolled** in the competition during snapshots

#### Formula:

**Daily Score = Σ (Token Holding Amount × KOL PnL × Rarity Multiplier)**

Where:
- **Token Holding Amount** = Number of KOL tokens the user holds **at snapshot time** (fetched from on-chain balances)
- **KOL PnL** = KOL's current 7-day PnL percentage (e.g., 15.5% → 15.5)
- **Rarity Multiplier** = Multiplier based on KOL's rarity tier:
  - **Legendary:** 2.0×
  - **Epic:** 1.5×
  - **Rare:** 1.2×
  - **Common:** 1.0×

#### Example Calculation:

User holds:
- 10 tokens of Legendary KOL with 20% PnL
- 5 tokens of Epic KOL with 15% PnL

```
Daily Score = (10 × 20 × 2.0) + (5 × 15 × 1.5)
            = 400 + 112.5
            = 512.5
```

---

### Window Score Calculation (Competition Total)

At the end of the competition, each user's **Window Score** is calculated.

#### Formula:

**Window Score = Σ (All Daily Scores for that user)**

This is the sum of all daily scores the user accumulated across all snapshots.

#### Example:

If a user has:
- Snapshot 1 Daily Score: 512.5
- Snapshot 2 Daily Score: 620.0

```
Window Score = 512.5 + 620.0 = 1132.5
```

---

### Tournament Points (TP) Distribution

After competition finalization, TP is distributed based on each user's **Window Score**.

#### Formula:

**User's TP = (User's Window Score / Total Window Score of All Users) × TP_POOL**

Where:
- **Total Window Score** = Sum of all users' window scores
- **TP_POOL** = 10,000

#### Example:

Competition with 3 users:

| User | Window Score |
|------|--------------|
| Alice | 1500 |
| Bob | 1000 |
| Charlie | 500 |

**Total Window Score = 1500 + 1000 + 500 = 3000**

TP Distribution:
```
Alice's TP   = (1500 / 3000) × 10,000 = 5,000 TP
Bob's TP     = (1000 / 3000) × 10,000 = 3,333.33 TP
Charlie's TP = (500 / 3000) × 10,000  = 1,666.67 TP

Total Distributed = 10,000 TP ✓
```

---

### Leaderboard Points (Ranking System)

Leaderboard Points are calculated based on rank position.

#### Formula:

**Leaderboard Points = 100 - (Rank - 1)**

Where:
- **Rank 1** gets 100 points
- **Rank 2** gets 99 points
- **Rank 3** gets 98 points
- And so on...

#### Leaderboard Display Formula:

For display purposes, the leaderboard score combines both TP and ranking:

**Leaderboard Score = Tournament Points + Leaderboard Points**

#### Example:

| Rank | User | Window Score | TP Earned | Leaderboard Points | Total Display Score |
|------|------|--------------|-----------|-------------------|---------------------|
| 1 | Alice | 1500 | 5,000 | 100 | 5,100 |
| 2 | Bob | 1000 | 3,333.33 | 99 | 3,432.33 |
| 3 | Charlie | 500 | 1,666.67 | 98 | 1,764.67 |

---

### Pack Claim System

After competition finalization, users can claim packs based on their TP.

#### Pack TP Costs:

- **Pro Pack:** 100 TP
- **Legendary Pack:** 250 TP
- **Epic Pack:** 500 TP

#### Formula:

**Number of Packs User Can Claim = floor(User's TP / Pack Cost)**

#### Example:

User earned **5,000 TP**:

```
Pro Packs available      = floor(5000 / 100) = 50 packs
Legendary Packs available = floor(5000 / 250) = 20 packs
Epic Packs available     = floor(5000 / 500) = 10 packs
```

User can mix and match:
- Claim 5 Epic Packs (2,500 TP) + 10 Legendary Packs (2,500 TP) = 5,000 TP used ✓

---

## Summary Flow Diagram

```
Competition Start (Mon 00:00 UTC)
        ↓
Users Buy KOL Tokens → Auto-join competition on first purchase
        ↓
Snapshot #1 (Mon 14:00 UTC)
        ↓ Calculate Daily Score
        ↓ Daily Score = Σ(Holdings × PnL × Rarity Multiplier)
        ↓
Users Continue Buying/Trading
        ↓
Snapshot #2 (Tue 14:00 UTC)
        ↓ Calculate Daily Score again
        ↓
Competition Ends (Wed 12:00 UTC)
        ↓ Calculate Window Score
        ↓ Window Score = Σ(All Daily Scores)
        ↓ Calculate TP Distribution
        ↓ User's TP = (Window Score / Total Window Score) × 10,000
        ↓ Calculate Leaderboard Points
        ↓ Leaderboard Points = 100 - (Rank - 1)
        ↓
Display Results
        ↓
Users Claim Packs based on TP
        ↓
Reveal KOL Cards + Auto-Claim Tokens to Wallet
```

---

## Key Technical Notes

### Database Schema Updates
- `CompetitionEntry` table tracks user participation
- `KolHolding` table stores user's KOL token holdings per competition
- Daily scores stored as JSON in `dailyScores` field
- Final TP and leaderboard points stored after finalization

### API Endpoints Used
- `POST /api/competitions/start` - Start new competition
- `POST /api/cron/calculateDailyScores` - Snapshot trigger
- `POST /api/competitions/{id}/finalize` - Finalize competition
- `GET /api/competitions/{id}/leaderboard` - View rankings
- `GET /api/competitions/{id}/results` - View results

### Frontend States
1. **Active Competition** - Green banner, "View Live Scores" enabled
2. **Finalized Competition** - Results view, "Reveal Winners" enabled
3. **No Competition** - Countdown or "Coming Soon" state

---

## Troubleshooting

### Scores showing 0 after buying tokens?
- Scores only update at snapshot intervals
- Wait for next snapshot (2 min in test mode, 14 hrs in production)
- Or click "Take Snapshot" in Test Mode

### TP not appearing in profile?
- Competition must be FINALIZED first
- Check "Reveal Winners" to see your TP
- TP is added to `totalTournamentPoints` in user table

### Can't claim packs?
- Ensure competition is finalized
- Check you have enough TP for the pack tier
- Pack costs: Pro (100), Legendary (250), Epic (500)

### Test Mode not visible?
- Ensure you're in development mode (`NODE_ENV=development`)
- Or set `NEXT_PUBLIC_ENABLE_TEST_MODE=true` in environment variables

---

## Next Steps After Testing

1. ✅ Verify all calculations match the math formulas
2. ✅ Test with multiple users to confirm TP distribution sums to 10,000
3. ✅ Ensure pack claiming works correctly
4. ✅ Check that tokens are auto-claimed to wallet after reveal
5. ✅ Confirm leaderboard rankings are correct

Once validated, deploy to production with:
- Google Cloud Scheduler for cron jobs
- Production competition windows (Mon-Wed)
- Real snapshot intervals (14 hours)
