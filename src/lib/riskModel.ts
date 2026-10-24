import model from '../../ml/artifacts/personalized_heat_risk_model.json'

type Profile = {
  age?: string | number
  activity_level?: string
  heat_exposure?: string[]
  water_intake_liters?: string | number
  symptoms?: Record<string, string>
}

export type RiskResult = { score: number; band: 'Lower' | 'Moderate' | 'Elevated' | 'High'; reasons: string[]; disclaimer: string }

function sigmoid(x: number) { return 1 / (1 + Math.exp(-x)) }

export function scorePersonalRisk(tempC: number, humidityPct: number, profile: Profile = {}): RiskResult {
  const exposure = profile.heat_exposure ?? []
  const symptoms = profile.symptoms ?? {}
  const activeSymptoms = Object.entries(symptoms).filter(([k, v]) => {
    if (k === 'energy') return v === 'A little lower' || v === 'Much lower'
    if (k === 'thirst') return v === 'More than usual' || v === 'Constantly thirsty'
    if (k === 'dizziness') return v === 'Occasional' || v === 'Frequent'
    if (k === 'headache') return v === 'Mild' || v === 'Strong'
    if (k === 'nausea') return v === 'Some nausea' || v === 'Persistent / vomiting'
    if (k === 'sweating') return v === 'More than usual' || v === 'Much less than usual'
    return false
  }).length
  const activity = String(profile.activity_level ?? 'Mostly indoors')
  const exposureHours = Math.min(12, (activity.includes('Heavy') ? 8 : activity.includes('Outdoor work') ? 6 : activity.includes('Light outdoor') ? 3 : 1) + exposure.length * 0.6)
  const exertion = activity.includes('Heavy') ? 3 : activity.includes('Outdoor work') ? 2 : activity.includes('Light outdoor') ? 1 : 0
  const water = Number(profile.water_intake_liters ?? 2)
  const featureValues: Record<string, number> = {
    apparent_temp_c: tempC,
    relative_humidity_pct: humidityPct,
    age_years: Math.max(18, Math.min(100, Number(profile.age ?? 30))),
    outdoor_exposure_hours: exposureHours,
    exertion_level: exertion,
    hydration_gap_l: Math.max(0, 2.5 - (Number.isFinite(water) ? water : 2)),
    symptom_count: activeSymptoms,
    cooling_access: exposure.includes('Limited access to cooling') ? 0 : 1,
    chronic_risk_flag: 0,
  }
  const z = model.features.reduce((sum: number, feature: string, i: number) => sum + ((featureValues[feature] - model.means[i]) / (model.scales[i] || 1)) * model.coefficients[i], model.intercept)
  const probability = sigmoid(z)
  const score = Math.round(probability * 100)
  const band: RiskResult['band'] = score >= 75 ? 'High' : score >= 55 ? 'Elevated' : score >= 30 ? 'Moderate' : 'Lower'
  const reasons: string[] = []
  if (tempC >= 35) reasons.push('High apparent temperature')
  if (humidityPct >= 70) reasons.push('High humidity may limit evaporative cooling')
  if (exposureHours >= 4) reasons.push('Several hours of outdoor exposure estimated from your profile')
  if (activeSymptoms > 0) reasons.push(`${activeSymptoms} self-reported symptom factor${activeSymptoms === 1 ? '' : 's'}`)
  if (Number(profile.water_intake_liters ?? 2) < 1.5) reasons.push('Reported water intake is low')
  if (!reasons.length) reasons.push('No major risk contributors identified from the available inputs')
  return { score, band, reasons, disclaimer: 'Prototype score from a model trained on synthetic, rule-labelled data. It is not clinically validated and must not be used for diagnosis or emergency triage.' }
}
