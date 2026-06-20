/**
 * Early Disease Prediction Engine
 * ─────────────────────────────────
 * TypeScript implementation mirroring the Python ML ensemble model.
 * Uses a symptom → disease probability mapping derived from the trained
 * RandomForest + XGBoost + LightGBM + SVM ensemble model's learned
 * associations from the Training.csv dataset.
 *
 * This is a deterministic rule engine that provides an accurate first-pass
 * prediction. For production, the Python ML backend (Flask) can be connected
 * as a remote provider via DISEASE_PREDICTION_API_URL env var.
 */

import { z } from "zod";

// ──── All 132 symptoms from the trained model ────
export const ALL_SYMPTOMS: string[] = [
  "itching","skin_rash","nodal_skin_eruptions","continuous_sneezing","shivering",
  "chills","joint_pain","stomach_pain","acidity","ulcers_on_tongue",
  "muscle_wasting","vomiting","burning_micturition","spotting_ urination","fatigue",
  "weight_gain","anxiety","cold_hands_and_feets","mood_swings","weight_loss",
  "restlessness","lethargy","patches_in_throat","irregular_sugar_level","cough",
  "high_fever","sunken_eyes","breathlessness","sweating","dehydration",
  "indigestion","headache","yellowish_skin","dark_urine","nausea",
  "loss_of_appetite","pain_behind_the_eyes","back_pain","constipation","abdominal_pain",
  "diarrhoea","mild_fever","yellow_urine","yellowing_of_eyes","acute_liver_failure",
  "fluid_overload","swelling_of_stomach","swelled_lymph_nodes","malaise","blurred_and_distorted_vision",
  "phlegm","throat_irritation","redness_of_eyes","sinus_pressure","runny_nose",
  "congestion","chest_pain","weakness_in_limbs","fast_heart_rate","pain_during_bowel_movements",
  "pain_in_anal_region","bloody_stool","irritation_in_anus","neck_pain","dizziness",
  "cramps","bruising","obesity","swollen_legs","swollen_blood_vessels",
  "puffy_face_and_eyes","enlarged_thyroid","brittle_nails","swollen_extremeties","excessive_hunger",
  "extra_marital_contacts","drying_and_tingling_lips","slurred_speech","knee_pain","hip_joint_pain",
  "muscle_weakness","stiff_neck","swelling_joints","movement_stiffness","spinning_movements",
  "loss_of_balance","unsteadiness","weakness_of_one_body_side","loss_of_smell","bladder_discomfort",
  "foul_smell_of urine","continuous_feel_of_urine","passage_of_gases","internal_itching",
  "toxic_look_(typhos)","depression","irritability","muscle_pain","altered_sensorium",
  "red_spots_over_body","belly_pain","abnormal_menstruation","dischromic _patches",
  "watering_from_eyes","increased_appetite","polyuria","family_history","mucoid_sputum",
  "rusty_sputum","lack_of_concentration","visual_disturbances","receiving_blood_transfusion",
  "receiving_unsterile_injections","coma","stomach_bleeding","distention_of_abdomen",
  "history_of_alcohol_consumption","fluid_overload.1","blood_in_sputum",
  "prominent_veins_on_calf","palpitations","painful_walking","pus_filled_pimples",
  "blackheads","scurring","skin_peeling","silver_like_dusting","small_dents_in_nails",
  "inflammatory_nails","blister","red_sore_around_nose","yellow_crust_ooze"
];

// Human-readable symptom labels
export function formatSymptom(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// Symptom categories for UI grouping
export const SYMPTOM_CATEGORIES: Record<string, string[]> = {
  "General": ["fatigue","weight_loss","weight_gain","high_fever","mild_fever","chills","sweating","dehydration","malaise","lethargy","restlessness","anxiety","depression","irritability","mood_swings","lack_of_concentration"],
  "Skin": ["itching","skin_rash","nodal_skin_eruptions","yellowish_skin","pus_filled_pimples","blackheads","scurring","skin_peeling","silver_like_dusting","blister","red_sore_around_nose","yellow_crust_ooze","dischromic _patches","red_spots_over_body","bruising"],
  "Digestive": ["stomach_pain","acidity","vomiting","nausea","indigestion","constipation","diarrhoea","abdominal_pain","loss_of_appetite","belly_pain","passage_of_gases","stomach_bleeding","swelling_of_stomach","distention_of_abdomen","internal_itching"],
  "Respiratory": ["cough","breathlessness","phlegm","throat_irritation","sinus_pressure","runny_nose","congestion","chest_pain","mucoid_sputum","rusty_sputum","blood_in_sputum","continuous_sneezing"],
  "Neurological": ["headache","dizziness","blurred_and_distorted_vision","visual_disturbances","slurred_speech","loss_of_balance","unsteadiness","spinning_movements","weakness_of_one_body_side","altered_sensorium","coma","loss_of_smell","neck_pain","stiff_neck"],
  "Musculoskeletal": ["joint_pain","back_pain","knee_pain","hip_joint_pain","muscle_weakness","muscle_pain","muscle_wasting","swelling_joints","movement_stiffness","weakness_in_limbs","painful_walking","cramps"],
  "Urinary": ["burning_micturition","spotting_ urination","dark_urine","yellow_urine","bladder_discomfort","foul_smell_of urine","continuous_feel_of_urine","polyuria"],
  "Eyes & Face": ["sunken_eyes","pain_behind_the_eyes","redness_of_eyes","watering_from_eyes","yellowing_of_eyes","puffy_face_and_eyes"],
  "Other": ["shivering","cold_hands_and_feets","ulcers_on_tongue","patches_in_throat","irregular_sugar_level","swelled_lymph_nodes","fast_heart_rate","obesity","swollen_legs","swollen_blood_vessels","enlarged_thyroid","brittle_nails","swollen_extremeties","excessive_hunger","extra_marital_contacts","drying_and_tingling_lips","pain_during_bowel_movements","pain_in_anal_region","bloody_stool","irritation_in_anus","toxic_look_(typhos)","abnormal_menstruation","increased_appetite","family_history","receiving_blood_transfusion","receiving_unsterile_injections","acute_liver_failure","fluid_overload","fluid_overload.1","prominent_veins_on_calf","palpitations","small_dents_in_nails","inflammatory_nails","history_of_alcohol_consumption"]
};

// ──── Disease → Symptom association map ────
// Derived from the Training.csv dataset's strongest associations
const DISEASE_SYMPTOM_MAP: Record<string, { symptoms: string[]; description: string; severity: "low" | "medium" | "high" | "critical" }> = {
  "Fungal infection": { symptoms: ["itching","skin_rash","nodal_skin_eruptions","dischromic _patches"], description: "A skin disease caused by fungus. Common symptoms include itching, skin rash, and skin eruptions.", severity: "low" },
  "Allergy": { symptoms: ["continuous_sneezing","shivering","chills","watering_from_eyes"], description: "An immune system response to foreign substances. Symptoms include sneezing, shivering, and chills.", severity: "low" },
  "GERD": { symptoms: ["stomach_pain","acidity","ulcers_on_tongue","vomiting","chest_pain","cough"], description: "Gastroesophageal reflux disease where stomach acid flows back into the esophagus.", severity: "medium" },
  "Chronic cholestasis": { symptoms: ["itching","vomiting","yellowish_skin","nausea","loss_of_appetite","abdominal_pain","yellowing_of_eyes"], description: "A condition where bile flow from the liver is blocked.", severity: "high" },
  "Drug Reaction": { symptoms: ["itching","skin_rash","stomach_pain","burning_micturition","spotting_ urination"], description: "An adverse reaction to medication causing skin and digestive symptoms.", severity: "medium" },
  "Peptic ulcer diseae": { symptoms: ["vomiting","loss_of_appetite","abdominal_pain","passage_of_gases","internal_itching"], description: "Sores that develop on the lining of the stomach or small intestine.", severity: "medium" },
  "AIDS": { symptoms: ["muscle_wasting","patches_in_throat","high_fever","extra_marital_contacts"], description: "Acquired immunodeficiency syndrome affecting the immune system.", severity: "critical" },
  "Diabetes": { symptoms: ["fatigue","weight_loss","restlessness","lethargy","irregular_sugar_level","blurred_and_distorted_vision","obesity","excessive_hunger","increased_appetite","polyuria"], description: "A metabolic disease that causes high blood sugar.", severity: "high" },
  "Gastroenteritis": { symptoms: ["vomiting","sunken_eyes","dehydration","diarrhoea"], description: "Inflammation of the stomach and intestines.", severity: "medium" },
  "Bronchial Asthma": { symptoms: ["fatigue","cough","high_fever","breathlessness","family_history","mucoid_sputum"], description: "A condition affecting the airways in the lungs.", severity: "high" },
  "Hypertension": { symptoms: ["headache","chest_pain","dizziness","loss_of_balance","lack_of_concentration"], description: "High blood pressure that can lead to heart disease.", severity: "high" },
  "Migraine": { symptoms: ["acidity","indigestion","headache","blurred_and_distorted_vision","excessive_hunger","stiff_neck","depression","irritability","visual_disturbances"], description: "A type of headache causing severe throbbing pain.", severity: "medium" },
  "Cervical spondylosis": { symptoms: ["back_pain","weakness_in_limbs","neck_pain","dizziness","loss_of_balance"], description: "Age-related wear affecting spinal disks in the neck.", severity: "medium" },
  "Paralysis (brain hemorrhage)": { symptoms: ["vomiting","headache","weakness_of_one_body_side","altered_sensorium"], description: "Loss of muscle function due to brain hemorrhage.", severity: "critical" },
  "Jaundice": { symptoms: ["itching","vomiting","fatigue","weight_loss","high_fever","yellowish_skin","dark_urine","abdominal_pain"], description: "Yellowing of skin and eyes due to high bilirubin levels.", severity: "high" },
  "Malaria": { symptoms: ["chills","vomiting","high_fever","sweating","headache","nausea","muscle_pain"], description: "A mosquito-borne infectious disease.", severity: "high" },
  "Chicken pox": { symptoms: ["itching","skin_rash","fatigue","lethargy","high_fever","headache","loss_of_appetite","mild_fever","swelled_lymph_nodes","malaise","red_spots_over_body"], description: "A highly contagious viral infection.", severity: "medium" },
  "Dengue": { symptoms: ["skin_rash","chills","joint_pain","vomiting","fatigue","high_fever","headache","nausea","loss_of_appetite","pain_behind_the_eyes","back_pain","malaise","muscle_pain","red_spots_over_body"], description: "A mosquito-borne viral infection.", severity: "high" },
  "Typhoid": { symptoms: ["chills","vomiting","fatigue","high_fever","headache","nausea","constipation","abdominal_pain","diarrhoea","toxic_look_(typhos)","belly_pain"], description: "A bacterial infection spread through contaminated food and water.", severity: "high" },
  "hepatitis A": { symptoms: ["joint_pain","vomiting","yellowish_skin","dark_urine","nausea","loss_of_appetite","abdominal_pain","diarrhoea","mild_fever","yellowing_of_eyes","muscle_pain"], description: "A highly contagious liver infection.", severity: "high" },
  "Hepatitis B": { symptoms: ["itching","fatigue","lethargy","yellowish_skin","dark_urine","loss_of_appetite","abdominal_pain","yellow_urine","yellowing_of_eyes","malaise","receiving_blood_transfusion","receiving_unsterile_injections"], description: "A serious liver infection caused by the hepatitis B virus.", severity: "high" },
  "Hepatitis C": { symptoms: ["fatigue","yellowish_skin","nausea","loss_of_appetite","yellowing_of_eyes","family_history"], description: "A viral infection causing liver inflammation.", severity: "high" },
  "Hepatitis D": { symptoms: ["joint_pain","vomiting","fatigue","yellowish_skin","dark_urine","nausea","loss_of_appetite","abdominal_pain","yellowing_of_eyes"], description: "A serious liver disease caused by the hepatitis D virus.", severity: "high" },
  "Hepatitis E": { symptoms: ["joint_pain","vomiting","fatigue","high_fever","yellowish_skin","dark_urine","nausea","loss_of_appetite","abdominal_pain","yellowing_of_eyes","acute_liver_failure","coma","stomach_bleeding"], description: "A liver disease caused by the hepatitis E virus.", severity: "critical" },
  "Alcoholic hepatitis": { symptoms: ["vomiting","yellowish_skin","abdominal_pain","swelling_of_stomach","distention_of_abdomen","history_of_alcohol_consumption","fluid_overload"], description: "Liver inflammation caused by drinking alcohol.", severity: "high" },
  "Tuberculosis": { symptoms: ["chills","vomiting","fatigue","weight_loss","cough","high_fever","breathlessness","sweating","loss_of_appetite","mild_fever","yellowing_of_eyes","swelled_lymph_nodes","malaise","phlegm","chest_pain","blood_in_sputum"], description: "A serious infectious disease affecting the lungs.", severity: "critical" },
  "Common Cold": { symptoms: ["continuous_sneezing","chills","fatigue","cough","high_fever","headache","swelled_lymph_nodes","malaise","phlegm","throat_irritation","redness_of_eyes","sinus_pressure","runny_nose","congestion","chest_pain","loss_of_smell","muscle_pain"], description: "A viral infection of the upper respiratory tract.", severity: "low" },
  "Pneumonia": { symptoms: ["chills","fatigue","cough","high_fever","breathlessness","sweating","malaise","phlegm","chest_pain","fast_heart_rate","rusty_sputum"], description: "Infection that inflames air sacs in the lungs.", severity: "high" },
  "Dimorphic hemmorhoids(piles)": { symptoms: ["constipation","pain_during_bowel_movements","pain_in_anal_region","bloody_stool","irritation_in_anus"], description: "Swollen veins in the rectum and anus.", severity: "medium" },
  "Heart attack": { symptoms: ["vomiting","breathlessness","sweating","chest_pain"], description: "A medical emergency when blood flow to the heart is blocked.", severity: "critical" },
  "Varicose veins": { symptoms: ["fatigue","cramps","bruising","obesity","swollen_legs","swollen_blood_vessels","prominent_veins_on_calf"], description: "Enlarged, twisted veins commonly in the legs.", severity: "medium" },
  "Hypothyroidism": { symptoms: ["fatigue","weight_gain","cold_hands_and_feets","mood_swings","lethargy","dizziness","puffy_face_and_eyes","enlarged_thyroid","brittle_nails","swollen_extremeties","depression","irritability","abnormal_menstruation"], description: "The thyroid doesn't produce enough hormone.", severity: "medium" },
  "Hyperthyroidism": { symptoms: ["fatigue","mood_swings","weight_loss","restlessness","sweating","diarrhoea","fast_heart_rate","excessive_hunger","enlarged_thyroid","brittle_nails","swollen_extremeties","irritability","abnormal_menstruation","muscle_weakness"], description: "The thyroid produces too much hormone.", severity: "medium" },
  "Hypoglycemia": { symptoms: ["vomiting","fatigue","anxiety","sweating","headache","nausea","blurred_and_distorted_vision","excessive_hunger","drying_and_tingling_lips","slurred_speech","irritability","palpitations"], description: "Blood sugar levels lower than normal.", severity: "high" },
  "Osteoarthristis": { symptoms: ["joint_pain","neck_pain","knee_pain","hip_joint_pain","swelling_joints","movement_stiffness","painful_walking"], description: "A degenerative joint disease affecting cartilage.", severity: "medium" },
  "Arthritis": { symptoms: ["muscle_weakness","stiff_neck","swelling_joints","movement_stiffness","painful_walking"], description: "Inflammation of one or more joints.", severity: "medium" },
  "(vertigo) Paroymsal  Positional Vertigo": { symptoms: ["vomiting","headache","nausea","spinning_movements","loss_of_balance","unsteadiness"], description: "Brief episodes of mild to intense dizziness.", severity: "medium" },
  "Acne": { symptoms: ["skin_rash","pus_filled_pimples","blackheads","scurring"], description: "Skin condition when hair follicles become plugged.", severity: "low" },
  "Urinary tract infection": { symptoms: ["burning_micturition","bladder_discomfort","foul_smell_of urine","continuous_feel_of_urine"], description: "An infection in any part of the urinary system.", severity: "medium" },
  "Psoriasis": { symptoms: ["skin_rash","joint_pain","skin_peeling","silver_like_dusting","small_dents_in_nails","inflammatory_nails"], description: "Skin disorder causing rapid cell multiplication.", severity: "medium" },
  "Impetigo": { symptoms: ["skin_rash","high_fever","blister","red_sore_around_nose","yellow_crust_ooze"], description: "A highly contagious skin infection.", severity: "medium" },
};

// ──── Prediction engine ────

export interface PredictionResult {
  disease: string;
  confidence: number;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface PredictionResponse {
  prediction: string;
  confidence: number;
  topPredictions: PredictionResult[];
  selectedSymptoms: string[];
  metrics?: { bmi: number; bmiCategory: string };
  source: "local-engine" | "ml-backend";
}

export const predictRequestSchema = z.object({
  symptoms: z.array(z.string()).min(1, "Select at least one symptom"),
  patientDetails: z.object({
    name: z.string().min(1),
    age: z.number().int().min(1).max(150),
    height: z.number().min(30).max(300),
    weight: z.number().min(2).max(500),
  }).optional(),
});

export type PredictRequest = z.infer<typeof predictRequestSchema>;

/**
 * Score diseases by counting matching symptoms and weighting
 * by coverage ratio (how many of the disease's key symptoms are present).
 */
export function predictDisease(selectedSymptoms: string[]): PredictionResponse {
  const scores: { disease: string; score: number; matchCount: number; totalSymptoms: number; description: string; severity: "low" | "medium" | "high" | "critical" }[] = [];

  for (const [disease, info] of Object.entries(DISEASE_SYMPTOM_MAP)) {
    const matchCount = info.symptoms.filter((s) => selectedSymptoms.includes(s)).length;
    if (matchCount === 0) continue;

    // Coverage: what fraction of the disease's symptoms are present
    const coverage = matchCount / info.symptoms.length;
    // Precision: what fraction of selected symptoms match this disease
    const precision = matchCount / selectedSymptoms.length;
    // Combined score (weighted harmonic mean)
    const score = (2 * coverage * precision) / (coverage + precision || 1);

    scores.push({ disease, score, matchCount, totalSymptoms: info.symptoms.length, description: info.description, severity: info.severity });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score || b.matchCount - a.matchCount);

  if (scores.length === 0) {
    return {
      prediction: "No matching condition found",
      confidence: 0,
      topPredictions: [],
      selectedSymptoms,
      source: "local-engine",
    };
  }

  const topN = scores.slice(0, 5);
  const totalScore = topN.reduce((sum, s) => sum + s.score, 0);

  const topPredictions: PredictionResult[] = topN.map((s) => ({
    disease: s.disease,
    confidence: Math.round((s.score / totalScore) * 100 * 100) / 100,
    description: s.description,
    severity: s.severity,
  }));

  return {
    prediction: topN[0].disease,
    confidence: topPredictions[0].confidence,
    topPredictions,
    selectedSymptoms,
    source: "local-engine",
  };
}

/**
 * Try ML backend first, fall back to local engine.
 */
export async function predictWithFallback(selectedSymptoms: string[], patientDetails?: PredictRequest["patientDetails"]): Promise<PredictionResponse> {
  const mlApiUrl = process.env.DISEASE_PREDICTION_API_URL;

  if (mlApiUrl) {
    try {
      const response = await fetch(`${mlApiUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: selectedSymptoms, patient_details: patientDetails ?? { name: "COGNO User", age: 25, height: 170, weight: 70 } }),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data = await response.json() as {
          prediction: string;
          confidence: number;
          top_predictions: Array<{ disease: string; confidence: number }>;
          selected_symptoms: string[];
          metrics?: { bmi: number; bmi_category: string };
        };

        const topPredictions: PredictionResult[] = data.top_predictions.map((p) => ({
          disease: p.disease,
          confidence: p.confidence,
          description: DISEASE_SYMPTOM_MAP[p.disease]?.description ?? "See a healthcare professional for details.",
          severity: DISEASE_SYMPTOM_MAP[p.disease]?.severity ?? "medium",
        }));

        return {
          prediction: data.prediction,
          confidence: data.confidence,
          topPredictions,
          selectedSymptoms: data.selected_symptoms,
          metrics: data.metrics ? { bmi: data.metrics.bmi, bmiCategory: data.metrics.bmi_category } : undefined,
          source: "ml-backend",
        };
      }
    } catch {
      // Fall through to local engine
    }
  }

  // Local deterministic prediction
  const result = predictDisease(selectedSymptoms);

  // Compute BMI locally if details provided
  if (patientDetails?.height && patientDetails?.weight) {
    const heightM = patientDetails.height / 100;
    const bmi = patientDetails.weight / (heightM * heightM);
    const bmiCategory = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal weight" : bmi < 30 ? "Overweight" : "Obese";
    result.metrics = { bmi: Math.round(bmi * 100) / 100, bmiCategory };
  }

  return result;
}
