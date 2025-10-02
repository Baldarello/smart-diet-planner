/**
 * Estimates calories burned from walking based on steps, duration, and weight.
 * The formula adjusts for pace/intensity.
 * @param steps Number of steps taken.
 * @param hours Duration of activity in hours.
 * @param weightKg User's weight in kilograms.
 * @returns Estimated calories burned, or null if inputs are invalid.
 */
export function calculateCaloriesBurned(steps: number, hours: number, weightKg: number): number | null {
    if (isNaN(hours) || hours <= 0 || steps <= 0 || isNaN(weightKg) || weightKg <= 0) {
        return null;
    }

    // Baseline calories burned per step, adjusted for weight (MET value approximation).
    // Average 70kg person burns ~0.045 kcal/step.
    const BASE_CALORIES_PER_STEP = (weightKg / 70) * 0.045;
    
    // Baseline pace for moderate walking is ~5500 steps/hour (around 5.5 km/h).
    const BASELINE_PACE = 5500;
    
    const pace = steps / hours;
    
    // Create a modifier based on how much faster/slower the pace is than baseline.
    // For every 2000 steps/hour deviation, adjust calorie burn by 10%.
    const paceDifference = pace - BASELINE_PACE;
    const intensityModifier = 1 + (paceDifference / 2000) * 0.10;

    // Clamp the modifier to prevent extreme values (e.g., from very short durations).
    // A very slow shuffle should still burn something, and a run shouldn't be excessively high.
    const clampedModifier = Math.max(0.8, Math.min(intensityModifier, 1.5));

    const calories = Math.round(steps * BASE_CALORIES_PER_STEP * clampedModifier);
    return calories;
}
