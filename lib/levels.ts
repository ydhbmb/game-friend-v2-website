export function calculateLevel(exp: number, userId?: number) {
  // 管理员特权等级
  if (userId === 1) return { level: 70, name: "趣皇豆皇", currentLevelExp: 9999, nextLevelExp: 9999 };
  const specialIds = [10000, 11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888, 99999];
  if (userId && specialIds.includes(userId)) {
    return { level: 69, name: "正一品趣豆", currentLevelExp: 9999, nextLevelExp: 9999 };
  }

  const levelsData = [
    { level: 1, name: "品名趣豆", totalExp: 0 },
    { level: 2, name: "举人趣豆", totalExp: 12 },
    { level: 3, name: "从九品大理寺狱丞趣豆", totalExp: 26 },
    { level: 4, name: "正九品大理寺司直趣豆", totalExp: 42 },
    { level: 5, name: "从九品校书趣豆", totalExp: 60 },
    { level: 6, name: "正九品奉礼趣豆", totalExp: 80 },
    { level: 7, name: "从九品参军趣豆", totalExp: 101 },
    { level: 8, name: "正九品主簿趣豆", totalExp: 123 },
    { level: 9, name: "从九品尉趣豆", totalExp: 146 },
    { level: 10, name: "正九品录事趣豆", totalExp: 170 },
    { level: 11, name: "从八品医博士趣豆", totalExp: 195 },
    { level: 12, name: "正八品协律趣豆", totalExp: 222 },
    { level: 13, name: "从八品评事趣豆", totalExp: 250 },
    { level: 14, name: "正八品司法趣豆", totalExp: 279 },
    { level: 15, name: "从八品司仓趣豆", totalExp: 309 },
    { level: 16, name: "正八品司户趣豆", totalExp: 340 },
    { level: 17, name: "从八品助教趣豆", totalExp: 372 },
    { level: 18, name: "正八品丞趣豆", totalExp: 405 },
    { level: 19, name: "从八品奉御趣豆", totalExp: 439 },
    { level: 20, name: "正八品内丞趣豆", totalExp: 474 },
    { level: 21, name: "从八品旅帅趣豆", totalExp: 510 },
    { level: 22, name: "正八品队正趣豆", totalExp: 547 },
    { level: 23, name: "从七品拾遗趣豆", totalExp: 585 },
    { level: 24, name: "正七品补阙趣豆", totalExp: 625 },
    { level: 25, name: "从七品主簿趣豆", totalExp: 667 },
    { level: 26, name: "正七品博士趣豆", totalExp: 711 },
    { level: 27, name: "从七品参军趣豆", totalExp: 757 },
    { level: 28, name: "正七品录事趣豆", totalExp: 805 },
    { level: 29, name: "从七品长史趣豆", totalExp: 855 },
    { level: 30, name: "正七品司马趣豆", totalExp: 907 },
    { level: 31, name: "从七品郎将趣豆", totalExp: 961 },
    { level: 32, name: "正七品校尉趣豆", totalExp: 1017 },
    { level: 33, name: "从七品直官趣豆", totalExp: 1075 },
    { level: 34, name: "正七品直史趣豆", totalExp: 1135 },
    { level: 35, name: "从六品通事趣豆", totalExp: 1197 },
    { level: 36, name: "正六品侍御史趣豆", totalExp: 1262 },
    { level: 37, name: "从六品司议趣豆", totalExp: 1330 },
    { level: 38, name: "正六品洗马趣豆", totalExp: 1401 },
    { level: 39, name: "从六品赞善趣豆", totalExp: 1475 },
    { level: 40, name: "正六品郎中趣豆", totalExp: 1552 },
    { level: 41, name: "从六品镇将趣豆", totalExp: 1632 },
    { level: 42, name: "正六品果毅趣豆", totalExp: 1715 },
    { level: 43, name: "从六品文学趣豆", totalExp: 1801 },
    { level: 44, name: "正六品功曹趣豆", totalExp: 1890 },
    { level: 45, name: "从五品员外郎趣豆", totalExp: 1982 },
    { level: 46, name: "正五品郎中趣豆", totalExp: 2078 },
    { level: 47, name: "从五品刺史趣豆", totalExp: 2178 },
    { level: 48, name: "正五品长史趣豆", totalExp: 2282 },
    { level: 49, name: "从五品别驾趣豆", totalExp: 2390 },
    { level: 50, name: "正五品司马趣豆", totalExp: 2502 },
    { level: 51, name: "从五品郎将趣豆", totalExp: 2618 },
    { level: 52, name: "正五品都尉趣豆", totalExp: 2738 },
    { level: 53, name: "从四品少卿趣豆", totalExp: 2862 },
    { level: 54, name: "正四品少尹趣豆", totalExp: 2990 },
    { level: 55, name: "从四品刺史趣豆", totalExp: 3122 },
    { level: 56, name: "正四品长史趣豆", totalExp: 3258 },
    { level: 57, name: "从四品将军趣豆", totalExp: 3398 },
    { level: 58, name: "正四品将军趣豆", totalExp: 3542 },
    { level: 59, name: "从三品侍郎趣豆", totalExp: 3690 },
    { level: 60, name: "正三品卿趣豆", totalExp: 3845 },
    { level: 61, name: "从三品都督趣豆", totalExp: 4007 },
    { level: 62, name: "正三品节度使趣豆", totalExp: 4176 },
    { level: 63, name: "从三品大将军趣豆", totalExp: 4352 },
    { level: 64, name: "从二品尚书仆射趣豆", totalExp: 4535 },
    { level: 65, name: "正二品侍中趣豆", totalExp: 4745 },
    { level: 66, name: "从二品中书令趣豆", totalExp: 4980 },
    { level: 67, name: "正二品国公趣豆", totalExp: 5240 },
    { level: 68, name: "从一品骠骑大趣豆", totalExp: 5530 }
  ];

  let currentLevelData = levelsData[0];
  let nextLevelData = levelsData[1];

  for (let i = 0; i < levelsData.length; i++) {
    if (exp >= levelsData[i].totalExp) {
      currentLevelData = levelsData[i];
      nextLevelData = levelsData[i + 1] || levelsData[i];
    } else {
      break;
    }
  }

  return {
    level: currentLevelData.level,
    name: currentLevelData.name,
    currentLevelExp: exp - currentLevelData.totalExp,
    nextLevelExp: nextLevelData.totalExp - currentLevelData.totalExp,
    isMaxLevel: currentLevelData.level === 68
  };
}