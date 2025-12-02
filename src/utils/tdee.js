const CALORIES_PER_KG = 7700; // kcal per 1kg weight change

/**
 * Helper: compute linear regression slope (weight change per day)
 * @param {Array} entries - Array of { date, weight, calories }
 * @returns {Number} slope (kg/day)
 */
export function computeWeightSlope(entries) {
    const validEntries = entries.filter(e => e.weight);
    const n = validEntries.length;
    if (n < 2) return 0;

    const firstDate = new Date(validEntries[0].date).getTime();

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
        const entryDate = new Date(validEntries[i].date).getTime();
        const x = (entryDate - firstDate) / (1000 * 60 * 60 * 24); // days since first entry
        const y = validEntries[i].weight;

        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    }

    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    return slope; // kg/day
}

/**
 * Compute average calories over entries
 * @param {Array} entries 
 * @returns {Number}
 */
export function computeAvgCalories(entries) {
    const validEntries = entries.filter(e => e.calories);
    if (validEntries.length === 0) return 0;

    const sum = validEntries.reduce((acc, e) => acc + e.calories, 0);
    return sum / validEntries.length;
}

/**
 * Compute adaptive TDEE
 * @param {Array} logs - Full history of logs
 * @param {Number} currentTDEE - Fallback or previous TDEE
 * @returns {Number}
 */
export function calculateAdaptiveTDEE(logs, currentTDEE = 2000) {
    if (!logs || logs.length < 3) return currentTDEE;

    const sortedLogs = [...logs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const recentLogs = sortedLogs.slice(-14);

    if (recentLogs.length < 2) return currentTDEE;

    const slopeKgPerDay = computeWeightSlope(recentLogs);
    const avgCalories = computeAvgCalories(recentLogs);

    if (avgCalories === 0) return currentTDEE; // No calorie data


    const tdee = avgCalories - (slopeKgPerDay * CALORIES_PER_KG);

    // Light smoothing to prevent volatile jumps
    // Formula: smoothed = previous + (calculated - previous) * 0.3
    // This gives 30% weight to new value, 70% to previous for stability
    const smoothed = currentTDEE + (tdee - currentTDEE) * 0.3;

    return Math.round(smoothed);
}

/**
 * Compute target calories based on goal and target weight change
 * @param {Number} adaptiveTDEE 
 * @param {Number} weeklyRate - kg per week (negative for loss, positive for gain)
 * @returns {Number}
 */
export function computeCalorieTarget(adaptiveTDEE, weeklyRate) {
    const adjustmentPerDay = (weeklyRate * CALORIES_PER_KG) / 7;
    return adaptiveTDEE + adjustmentPerDay;
}

/**
 * Estimate initial TDEE based on weight (nSuns approximation)
 * Slope ~ 27.78, Intercept ~ 97
 * @param {Number} weightKg 
 * @returns {Number}
 */
export function estimateInitialTDEE(weightKg) {
    if (!weightKg) return 2000;
    return Math.round(27.78 * weightKg + 97);
}
