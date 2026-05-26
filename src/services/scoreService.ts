export type CurrentScore = {
  kills: number;
  survivalTime: number;
  score: number;
};

let currentScore: CurrentScore = {
  kills: 0,
  survivalTime: 0,
  score: 0,
};

export function resetScore(): void {
  currentScore = {
    kills: 0,
    survivalTime: 0,
    score: 0,
  };
}

export function updateKills(kills: number): void {
  currentScore.kills = kills;
  calculateScore();
}

export function updateSurvivalTime(seconds: number): void {
  currentScore.survivalTime = seconds;
  calculateScore();
}

function calculateScore(): void {
  currentScore.score =
    Math.floor(currentScore.survivalTime * 10) + currentScore.kills * 100;
}

export function getCurrentScore(): CurrentScore {
  return currentScore;
}