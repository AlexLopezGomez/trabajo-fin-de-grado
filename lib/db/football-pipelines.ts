/**
 * Pre-built MongoDB aggregation pipelines for football analytics.
 * All pipelines operate on the `football_matches` collection.
 * Fields used: league, season, season_year, home_team_name, away_team_name,
 * home_score, away_score, half_time_home_score, half_time_away_score,
 * home_shots, away_shots, home_shots_on_target, away_shots_on_target,
 * home_corners, away_corners, home_fouls, away_fouls,
 * home_yellow_cards, away_yellow_cards, home_red_cards, away_red_cards
 */

/** Top teams by average corners per match (one or all seasons) */
export function topTeamsByCorners(
  league: string,
  season?: string,
  limit = 15
) {
  const match: Record<string, unknown> = {
    league,
    home_corners: { $ne: null },
    away_corners: { $ne: null },
  };
  if (season) match.season = season;

  return [
    { $match: match },
    {
      $facet: {
        as_home: [
          {
            $group: {
              _id: "$home_team_name",
              total_corners: { $sum: "$home_corners" },
              matches: { $sum: 1 },
            },
          },
        ],
        as_away: [
          {
            $group: {
              _id: "$away_team_name",
              total_corners: { $sum: "$away_corners" },
              matches: { $sum: 1 },
            },
          },
        ],
      },
    },
    {
      $project: {
        combined: { $concatArrays: ["$as_home", "$as_away"] },
      },
    },
    { $unwind: "$combined" },
    { $replaceRoot: { newRoot: "$combined" } },
    {
      $group: {
        _id: "$_id",
        total_corners: { $sum: "$total_corners" },
        matches: { $sum: "$matches" },
      },
    },
    {
      $addFields: {
        avg_corners_per_match: {
          $round: [{ $divide: ["$total_corners", "$matches"] }, 2],
        },
      },
    },
    { $sort: { avg_corners_per_match: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        team: "$_id",
        total_corners: 1,
        matches: 1,
        avg_corners_per_match: 1,
      },
    },
  ];
}

/** Top teams by total cards (yellow + red) per match */
export function topTeamsByCards(
  league: string,
  season?: string,
  limit = 15
) {
  const match: Record<string, unknown> = { league };
  if (season) match.season = season;

  return [
    { $match: match },
    {
      $facet: {
        as_home: [
          {
            $group: {
              _id: "$home_team_name",
              yellow: { $sum: { $ifNull: ["$home_yellow_cards", 0] } },
              red: { $sum: { $ifNull: ["$home_red_cards", 0] } },
              matches: { $sum: 1 },
            },
          },
        ],
        as_away: [
          {
            $group: {
              _id: "$away_team_name",
              yellow: { $sum: { $ifNull: ["$away_yellow_cards", 0] } },
              red: { $sum: { $ifNull: ["$away_red_cards", 0] } },
              matches: { $sum: 1 },
            },
          },
        ],
      },
    },
    {
      $project: {
        combined: { $concatArrays: ["$as_home", "$as_away"] },
      },
    },
    { $unwind: "$combined" },
    { $replaceRoot: { newRoot: "$combined" } },
    {
      $group: {
        _id: "$_id",
        total_yellow: { $sum: "$yellow" },
        total_red: { $sum: "$red" },
        matches: { $sum: "$matches" },
      },
    },
    {
      $addFields: {
        total_cards: { $add: ["$total_yellow", "$total_red"] },
        cards_per_match: {
          $round: [
            {
              $divide: [
                { $add: ["$total_yellow", "$total_red"] },
                "$matches",
              ],
            },
            2,
          ],
        },
      },
    },
    { $sort: { total_cards: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        team: "$_id",
        total_yellow: 1,
        total_red: 1,
        total_cards: 1,
        cards_per_match: 1,
        matches: 1,
      },
    },
  ];
}

/** Attack vs defence ranking: goals scored and conceded per team */
export function attackVsDefenceRanking(league: string, season: string) {
  return [
    {
      $match: {
        league,
        season,
        home_score: { $ne: null },
        away_score: { $ne: null },
      },
    },
    {
      $facet: {
        as_home: [
          {
            $group: {
              _id: "$home_team_name",
              goals_scored: { $sum: "$home_score" },
              goals_conceded: { $sum: "$away_score" },
              matches: { $sum: 1 },
              wins: { $sum: { $cond: [{ $gt: ["$home_score", "$away_score"] }, 1, 0] } },
              draws: { $sum: { $cond: [{ $eq: ["$home_score", "$away_score"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $lt: ["$home_score", "$away_score"] }, 1, 0] } },
            },
          },
        ],
        as_away: [
          {
            $group: {
              _id: "$away_team_name",
              goals_scored: { $sum: "$away_score" },
              goals_conceded: { $sum: "$home_score" },
              matches: { $sum: 1 },
              wins: { $sum: { $cond: [{ $gt: ["$away_score", "$home_score"] }, 1, 0] } },
              draws: { $sum: { $cond: [{ $eq: ["$away_score", "$home_score"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $lt: ["$away_score", "$home_score"] }, 1, 0] } },
            },
          },
        ],
      },
    },
    {
      $project: {
        combined: { $concatArrays: ["$as_home", "$as_away"] },
      },
    },
    { $unwind: "$combined" },
    { $replaceRoot: { newRoot: "$combined" } },
    {
      $group: {
        _id: "$_id",
        goals_scored: { $sum: "$goals_scored" },
        goals_conceded: { $sum: "$goals_conceded" },
        matches: { $sum: "$matches" },
        wins: { $sum: "$wins" },
        draws: { $sum: "$draws" },
        losses: { $sum: "$losses" },
      },
    },
    {
      $addFields: {
        goal_diff: { $subtract: ["$goals_scored", "$goals_conceded"] },
        points: { $add: [{ $multiply: ["$wins", 3] }, "$draws"] },
      },
    },
    { $sort: { points: -1, goal_diff: -1 } },
    {
      $project: {
        _id: 0,
        team: "$_id",
        matches: 1,
        wins: 1,
        draws: 1,
        losses: 1,
        goals_scored: 1,
        goals_conceded: 1,
        goal_diff: 1,
        points: 1,
      },
    },
  ];
}

/** Home vs away performance for a specific team */
export function homeVsAwayPerformance(teamName: string, league?: string) {
  const matchBase: Record<string, unknown> = {};
  if (league) matchBase.league = league;

  return [
    {
      $facet: {
        home: [
          {
            $match: {
              ...matchBase,
              home_team_name: teamName,
              home_score: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              matches: { $sum: 1 },
              goals_scored: { $sum: "$home_score" },
              goals_conceded: { $sum: "$away_score" },
              wins: { $sum: { $cond: [{ $gt: ["$home_score", "$away_score"] }, 1, 0] } },
              draws: { $sum: { $cond: [{ $eq: ["$home_score", "$away_score"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $lt: ["$home_score", "$away_score"] }, 1, 0] } },
              corners: { $sum: { $ifNull: ["$home_corners", 0] } },
              shots: { $sum: { $ifNull: ["$home_shots", 0] } },
              yellow_cards: { $sum: { $ifNull: ["$home_yellow_cards", 0] } },
            },
          },
          { $addFields: { venue: "home" } },
        ],
        away: [
          {
            $match: {
              ...matchBase,
              away_team_name: teamName,
              away_score: { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              matches: { $sum: 1 },
              goals_scored: { $sum: "$away_score" },
              goals_conceded: { $sum: "$home_score" },
              wins: { $sum: { $cond: [{ $gt: ["$away_score", "$home_score"] }, 1, 0] } },
              draws: { $sum: { $cond: [{ $eq: ["$away_score", "$home_score"] }, 1, 0] } },
              losses: { $sum: { $cond: [{ $lt: ["$away_score", "$home_score"] }, 1, 0] } },
              corners: { $sum: { $ifNull: ["$away_corners", 0] } },
              shots: { $sum: { $ifNull: ["$away_shots", 0] } },
              yellow_cards: { $sum: { $ifNull: ["$away_yellow_cards", 0] } },
            },
          },
          { $addFields: { venue: "away" } },
        ],
      },
    },
    {
      $project: {
        results: { $concatArrays: ["$home", "$away"] },
      },
    },
    { $unwind: "$results" },
    { $replaceRoot: { newRoot: "$results" } },
    {
      $addFields: {
        team: teamName,
        points: { $add: [{ $multiply: ["$wins", 3] }, "$draws"] },
        avg_goals_scored: { $round: [{ $divide: ["$goals_scored", "$matches"] }, 2] },
        avg_goals_conceded: { $round: [{ $divide: ["$goals_conceded", "$matches"] }, 2] },
      },
    },
    {
      $project: {
        _id: 0,
        team: 1,
        venue: 1,
        matches: 1,
        wins: 1,
        draws: 1,
        losses: 1,
        goals_scored: 1,
        goals_conceded: 1,
        points: 1,
        avg_goals_scored: 1,
        avg_goals_conceded: 1,
        corners: 1,
        shots: 1,
        yellow_cards: 1,
      },
    },
  ];
}

/** Points evolution season by season for a specific team */
export function teamPointsEvolution(teamName: string, league?: string) {
  const matchBase: Record<string, unknown> = {
    home_score: { $ne: null },
    away_score: { $ne: null },
  };
  if (league) matchBase.league = league;

  return [
    {
      $match: {
        ...matchBase,
        $or: [{ home_team_name: teamName }, { away_team_name: teamName }],
      },
    },
    {
      $addFields: {
        is_home: { $eq: ["$home_team_name", teamName] },
        team_goals: {
          $cond: [
            { $eq: ["$home_team_name", teamName] },
            "$home_score",
            "$away_score",
          ],
        },
        opp_goals: {
          $cond: [
            { $eq: ["$home_team_name", teamName] },
            "$away_score",
            "$home_score",
          ],
        },
      },
    },
    {
      $addFields: {
        match_points: {
          $cond: [
            { $gt: ["$team_goals", "$opp_goals"] },
            3,
            { $cond: [{ $eq: ["$team_goals", "$opp_goals"] }, 1, 0] },
          ],
        },
      },
    },
    {
      $group: {
        _id: { season: "$season", season_year: "$season_year" },
        matches: { $sum: 1 },
        points: { $sum: "$match_points" },
        goals_scored: { $sum: "$team_goals" },
        goals_conceded: { $sum: "$opp_goals" },
        wins: { $sum: { $cond: [{ $eq: ["$match_points", 3] }, 1, 0] } },
        draws: { $sum: { $cond: [{ $eq: ["$match_points", 1] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ["$match_points", 0] }, 1, 0] } },
      },
    },
    { $sort: { "_id.season_year": 1 } },
    {
      $project: {
        _id: 0,
        team: teamName,
        season: "$_id.season",
        season_year: "$_id.season_year",
        matches: 1,
        points: 1,
        goals_scored: 1,
        goals_conceded: 1,
        goal_diff: { $subtract: ["$goals_scored", "$goals_conceded"] },
        wins: 1,
        draws: 1,
        losses: 1,
      },
    },
  ];
}

/** Highest-scoring matches (most total goals) */
export function highestScoringMatches(
  league: string,
  season?: string,
  limit = 20
) {
  const match: Record<string, unknown> = {
    league,
    home_score: { $ne: null },
    away_score: { $ne: null },
  };
  if (season) match.season = season;

  return [
    { $match: match },
    {
      $addFields: {
        total_goals: { $add: ["$home_score", "$away_score"] },
      },
    },
    { $sort: { total_goals: -1, date: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        league: 1,
        season: 1,
        date: 1,
        home_team: "$home_team_name",
        away_team: "$away_team_name",
        home_score: 1,
        away_score: 1,
        total_goals: 1,
        half_time: {
          home: "$half_time_home_score",
          away: "$half_time_away_score",
        },
      },
    },
  ];
}

/** Upsets: winners whose pre-match odds were higher than a threshold */
export function oddsUpsets(
  league: string,
  season?: string,
  minOdds = 3.5,
  limit = 20
) {
  const matchFilter: Record<string, unknown> = {
    league,
    home_score: { $ne: null },
    away_score: { $ne: null },
  };
  if (season) matchFilter.season = season;

  return [
    { $match: matchFilter },
    {
      $lookup: {
        from: "football_odds",
        localField: "sofascore_id",
        foreignField: "match_id",
        as: "odds",
      },
    },
    { $unwind: { path: "$odds", preserveNullAndEmptyArrays: false } },
    {
      $addFields: {
        home_win: { $gt: ["$home_score", "$away_score"] },
        away_win: { $gt: ["$away_score", "$home_score"] },
      },
    },
    {
      $match: {
        $or: [
          { home_win: true, "odds.home_odds": { $gte: minOdds } },
          { away_win: true, "odds.away_odds": { $gte: minOdds } },
        ],
      },
    },
    {
      $addFields: {
        upset_team: {
          $cond: ["$home_win", "$home_team_name", "$away_team_name"],
        },
        upset_odds: {
          $cond: ["$home_win", "$odds.home_odds", "$odds.away_odds"],
        },
        opponent: {
          $cond: ["$home_win", "$away_team_name", "$home_team_name"],
        },
      },
    },
    { $sort: { upset_odds: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        league: 1,
        season: 1,
        date: 1,
        upset_team: 1,
        opponent: 1,
        score: {
          $concat: [
            { $toString: "$home_score" },
            "-",
            { $toString: "$away_score" },
          ],
        },
        upset_odds: 1,
        bookmaker: "$odds.bookmaker",
      },
    },
  ];
}
