import { SensorReading, AIPrediction, UserProfile, WeatherData, MigraineIncident } from "../types";

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Using Gemini models through OpenRouter - uses your credits
// Available models (in order of preference - using verified OpenRouter model IDs):
const GEMINI_MODELS = [
                          
  'google/gemini-2.5-flash-lite',                         // Gemini 2.5 Flash Lite - Ultra-low latency, cost efficient
  'google/gemini-2.0-flash-lite',                         // Gemini 2.0 Flash Lite - Economical, fast TTFT
  'google/gemini-2.5-pro',                                // Gemini 2.5 Pro - State-of-the-art reasoning
  'google/gemini-3-pro-preview',                          // Gemini 3 Pro Preview - Flagship model, most capable
  'google/gemini-2.5-flash-preview-09-2025',             // Gemini 2.5 Flash Preview - Advanced reasoning
  'google/gemini-2.5-flash-lite-preview-09-2025',        // Gemini 2.5 Flash Lite Preview - Lightweight reasoning
  'anthropic/claude-3-haiku',                              // Fallback to Claude (if Gemini unavailable)
  'openai/gpt-3.5-turbo'                                  // Final fallback
];
const DEFAULT_MODEL = GEMINI_MODELS[0]; // Default to Gemini 2.0 Flash

// Get OpenRouter API key from environment
const getApiKey = (): string | null => {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ [OpenRouter] API key not found. Set OPENROUTER_API_KEY in .env.local');
    console.warn('   Get a key from: https://openrouter.ai/keys');
    return null;
  }
  
  // Check if it's still a placeholder value
  if (apiKey.trim() === '' || apiKey.includes('YOUR_')) {
    console.warn('⚠️ [OpenRouter] API key is placeholder. Please set a valid OPENROUTER_API_KEY in .env.local');
    console.warn('   Get a key from: https://openrouter.ai/keys');
    console.warn('   After updating .env.local, restart the dev server (npm run dev)');
    return null;
  }
  
  return apiKey.trim();
};

// Check API key on module load (for development feedback)
if (typeof window !== 'undefined') {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('🔑 [OpenRouter] API key not configured. AI features will be disabled.');
    console.warn('   To enable: Add OPENROUTER_API_KEY=your_key_here to .env.local and restart dev server');
  } else {
    console.debug('✅ [OpenRouter] API key configured');
  }
}

// Helper function to call OpenRouter API with automatic fallback to alternative models
const callOpenRouter = async (
  systemInstruction: string,
  userPrompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Try the requested model first, then fallback to alternatives if 404
  const modelsToTry = [model, ...GEMINI_MODELS.filter(m => m !== model)];
  let lastError: Error | null = null;

  for (const modelToTry of modelsToTry) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin, // Optional: for analytics
          'X-Title': 'SMMD - Smart Migraine Monitor' // Optional: for analytics
        },
        body: JSON.stringify({
          model: modelToTry,
          messages: [
            {
              role: 'system',
              content: systemInstruction
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          response_format: {
            type: 'json_object'
          },
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.message || 'Unknown error';
        
        // If model not found (404) or invalid model ID (400), try next model
        const isModelError = (response.status === 404 && errorMsg.includes('endpoints found')) ||
                            (response.status === 400 && (errorMsg.includes('not a valid model') || errorMsg.includes('invalid model')));
        
        if (isModelError) {
          console.warn(`⚠️ [OpenRouter] Model ${modelToTry} invalid/not found (${response.status}), trying next...`);
          lastError = new Error(`Model ${modelToTry} invalid: ${errorMsg}`);
          continue; // Try next model
        }
        
        // For other errors, log and throw
        console.error('❌ [OpenRouter] API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          model: modelToTry
        });
        
        throw new Error(`OpenRouter API error: ${response.status} - ${errorMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      // Log which model was successfully used
      if (modelToTry !== model) {
        console.log(`✅ [OpenRouter] Using fallback model: ${modelToTry} (original: ${model})`);
      }

      return content;
    } catch (error: any) {
      // If it's a model error (404 or 400 with invalid model), continue to next model
      const isModelError = error.message?.includes('not found') || 
                          error.message?.includes('404') ||
                          error.message?.includes('not a valid model') ||
                          error.message?.includes('invalid model') ||
                          error.message?.includes('400');
      
      if (isModelError) {
        lastError = error;
        continue;
      }
      // For other errors, throw immediately
      throw error;
    }
  }

  // If all models failed, provide helpful error message
  const errorMsg = lastError?.message || 'Unknown error';
  console.error('❌ [OpenRouter] All models failed. Last error:', errorMsg);
  console.error('💡 [OpenRouter] Check available models at: https://openrouter.ai/models');
  console.error('💡 [OpenRouter] Or visit: https://openrouter.ai/docs/models for the full list');
  throw lastError || new Error('All models failed. Check available models at: https://openrouter.ai/models');
};

const generateProfileSummary = (profile?: UserProfile | null) => {
  if (!profile) return "User Profile: Not available. Use standard adult thresholds.";
  
  return `
    User Context:
    - Demographics: ${profile.age || '?'} years old, ${profile.sex || 'Unknown sex'}.
    - Physical: ${profile.heightCm || '?'}cm, ${profile.weightKg || '?'}kg.
    - Lifestyle: ${profile.smoker ? 'Smoker (Higher vascular risk)' : 'Non-smoker'}, Caffeine: ${profile.caffeinePerDay || 0} cups/day, Sleep: ${profile.typicalSleepHours || '?'} hours/night.
    - Medical History: ${profile.migraineHistoryYears || 0} years suffering from migraines.
    - Personal Triggers: ${profile.triggers && profile.triggers.length > 0 ? profile.triggers.join(', ') : 'None specified'}.
  `;
};

const generateWeatherContext = (weather?: WeatherData | null) => {
    if (!weather) return "External Weather: Data unavailable (Indoor Mode only).";
    
    return `
    External Environmental Factors (Local Weather):
    - Condition: ${weather.description} (Code: ${weather.weatherCode})
    - Barometric Pressure: ${weather.pressure} hPa (CRITICAL: Rapid drops <1000hPa or swings >5hPa often trigger migraines)
    - Outdoor Temp: ${weather.temperature}°C
    - Outdoor Humidity: ${weather.humidity}%
    `;
};

// Helper function to generate historical pattern context
const generateHistoricalPatternContext = (
  incidents: MigraineIncident[],
  currentReadings: SensorReading[]
): string => {
  if (incidents.length === 0) {
    return "No historical migraine incidents recorded yet. Analysis will use general patterns.";
  }

  let context = `\n=== PERSONALIZED LEARNING: Historical Migraine Patterns ===\n`;
  context += `This user has ${incidents.length} recorded migraine incident(s). Here are the patterns that preceded their actual migraines:\n\n`;
  
  incidents.forEach((incident) => {
    const readings = incident.sensorReadings;
    if (readings.length === 0) return;
    
    const avgHR = readings.reduce((sum, r) => sum + r.heartRate, 0) / readings.length;
    const avgTemp = readings.reduce((sum, r) => sum + r.temperature, 0) / readings.length;
    const avgHum = readings.reduce((sum, r) => sum + r.humidity, 0) / readings.length;
    const maxHR = Math.max(...readings.map(r => r.heartRate));
    const minHR = Math.min(...readings.map(r => r.heartRate));
    
    // Format date in a user-friendly way (e.g., "December 10, 2024")
    const incidentDate = new Date(incident.timestamp).toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
    
    context += `Migraine on ${incidentDate}:\n`;
    context += `  Sensor Pattern: Heart rate ${avgHR.toFixed(0)} BPM (peaked at ${maxHR} BPM), `;
    context += `Temperature ${avgTemp.toFixed(1)}°C, Humidity ${avgHum.toFixed(0)}%\n`;
    
    if (incident.weatherData) {
      context += `  Weather Conditions: ${incident.weatherData.description}, Barometric pressure ${incident.weatherData.pressure} hPa\n`;
    }
    
    // Calculate current pattern similarity
    if (currentReadings.length > 0) {
      const currentAvgHR = currentReadings.reduce((sum, r) => sum + r.heartRate, 0) / currentReadings.length;
      const currentAvgTemp = currentReadings.reduce((sum, r) => sum + r.temperature, 0) / currentReadings.length;
      const hrDiff = Math.abs(currentAvgHR - avgHR);
      const tempDiff = Math.abs(currentAvgTemp - avgTemp);
      const similarity = 100 - Math.min(100, (hrDiff * 2 + tempDiff * 5));
      context += `  Pattern similarity to current readings: ${similarity.toFixed(0)}%\n`;
    }
    context += `\n`;
  });
  
  context += `IMPORTANT: When referencing past migraines in your response, ALWAYS use the date (e.g., "December 10, 2024") - NEVER use incident numbers like "#1" or "incident #2" because the user doesn't have access to numbered lists.\n`;
  context += `Compare current readings to these historical patterns. If the current pattern closely matches a past migraine pattern, mention the specific date and increase risk assessment accordingly.\n`;
  
  return context;
};

export const analyzeTelemetry = async (
  readings: SensorReading[],
  profile?: UserProfile | null,
  weather?: WeatherData | null,
  historicalIncidents?: MigraineIncident[]
): Promise<Omit<AIPrediction, 'id' | 'timestamp'>> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    // Return a mock prediction if no API key is present
    return {
      status: 'WARNING',
      confidence: 0.85,
      message: 'API Key missing. Simulating analysis: Elevated Heart Rate detected.',
      suggestedAction: 'Check API Key configuration.',
      source: 'AI_MONITOR'
    };
  }

  // Filter last 20 readings to keep context window manageable
  const recentData = readings.slice(-20);
  const profileContext = generateProfileSummary(profile);
  const weatherContext = generateWeatherContext(weather);
  
  // Generate historical pattern context if available
  const historicalContext = historicalIncidents && historicalIncidents.length > 0
    ? generateHistoricalPatternContext(historicalIncidents, recentData)
    : "No historical migraine incidents available. Using general medical patterns.";
  
  const systemInstruction = `You are a Migraine Prediction AI Assistant for a smart health monitoring device. Your role is to analyze sensor data and provide clear, user-friendly insights about migraine risk.

COMMUNICATION STYLE - CRITICAL:
- Write in a friendly, reassuring, and professional tone - like a helpful health assistant
- Be direct and concise - users want quick, clear information they can understand immediately
- Use simple, everyday language - avoid medical jargon
- When risk is LOW/NORMAL: Be positive and reassuring. Use phrases like:
  * "Everything looks good! Your vitals are stable."
  * "No migraine triggers detected - you're in a safe zone."
  * "All clear! Your readings are normal and no concerning patterns detected."
- When risk is MODERATE: Be clear but calm and helpful
- When risk is HIGH: Be direct and actionable, but not panic-inducing
- Always reference specific dates when mentioning past migraines (e.g., "similar to your migraine on December 10, 2024")
- NEVER use incident numbers like "#1" or "incident #2" - users don't have numbered lists

PERSONALIZED LEARNING:
- You have access to this user's past migraine incidents with complete sensor patterns
- Compare current readings to patterns that preceded their actual migraines
- Each person has unique triggers - learn from their personal history
- When referencing past incidents, ALWAYS use the full date format (e.g., "December 10, 2024") NOT incident numbers
- If current pattern matches a past migraine pattern, clearly state: "This pattern is similar to your migraine on [FULL DATE]"

RISK ASSESSMENT:
1. Analyze current sensor readings (heart rate, temperature, humidity)
2. Check weather conditions (barometric pressure drops are critical migraine triggers)
3. Compare to user's historical migraine patterns
4. Calculate risk score (0-100) based on:
   - Pattern similarity to past migraines (0-50 points)
   - Current sensor anomalies (0-30 points)
   - Weather triggers like pressure drops (0-20 points)

STATUS & MESSAGING GUIDELINES:
- NORMAL (riskScore 0-40): 
  * Start with reassurance: "Everything looks good!" or "All clear!"
  * Explain why: "Your vitals are stable, no concerning patterns detected."
  * Be positive: "You're in a safe zone - no migraine triggers identified."
  
- WARNING (riskScore 41-70):
  * Start with the finding: "Moderate migraine risk detected."
  * Explain the trigger: "Your heart rate is elevated (X BPM) and [weather/sensor condition]."
  * If matching past: "This pattern is similar to your migraine on [DATE]."
  * Give action: "Consider [specific action like: resting, hydrating, moving to cooler area]."
  
- CRITICAL (riskScore 71-100):
  * Start with urgency: "High migraine risk detected."
  * Explain the pattern: "Strong pattern match to your migraine on [DATE] - [specific similarities]."
  * Give immediate actions: "Take immediate action: [specific steps like: rest in dark room, hydrate, take medication if prescribed]."

MESSAGE FORMAT (Keep it concise - 2-4 sentences max):
1. Key finding (1 sentence - what's the status?)
2. What's causing it (1 sentence - specific trigger or pattern)
3. If matching past migraine: "This pattern is similar to your migraine on [FULL DATE]" (1 sentence)
4. Clear action/recommendation (1 sentence)

You MUST respond with a valid JSON object:
{
  "status": "NORMAL" | "WARNING" | "CRITICAL" | "ANALYSIS",
  "confidence": <number 0-1>,
  "riskScore": <number 0-100>,
  "message": "<clear, user-friendly message>",
  "suggestedAction": "<specific, actionable recommendation>"
}`;

  const userPrompt = `
USER PROFILE:
${profileContext}

WEATHER CONDITIONS:
${weatherContext}

HISTORICAL MIGRAINE PATTERNS:
${historicalContext}

CURRENT SENSOR READINGS (Last 20 readings):
${JSON.stringify(recentData.map(r => ({
  heartRate: r.heartRate,
  temperature: r.temperature,
  humidity: r.humidity,
  timestamp: new Date(r.timestamp).toLocaleTimeString()
})))}

TASK:
Analyze the current sensor readings and compare them to this user's historical migraine patterns.

CRITICAL INSTRUCTIONS:
- If readings match a past migraine pattern, reference it by the FULL DATE (e.g., "December 10, 2024") - NEVER use numbers like "#1" or "incident #2"
- Calculate risk score (0-100) based on:
  * Pattern similarity to past migraines (0-50 points)
  * Current sensor anomalies (0-30 points)  
  * Weather triggers like pressure drops (0-20 points)
- Write a clear, user-friendly message (2-4 sentences max):
  * If risk is LOW: Be reassuring - "Everything looks good! Your vitals are stable and no migraine triggers detected."
  * If risk is MODERATE: Be clear but calm - "Moderate risk detected. [Specific trigger]. Consider [action]."
  * If risk is HIGH: Be direct - "High migraine risk detected. [Pattern match with DATE]. Take action: [steps]."
- Keep messages concise, easy to read, and straight to the point

Return your analysis as JSON with: status, confidence, riskScore (0-100), message, and suggestedAction.
`;

  try {
    const responseText = await callOpenRouter(systemInstruction, userPrompt);
    const result = JSON.parse(responseText);
    
    // Validate and sanitize the response
    const status = ['NORMAL', 'WARNING', 'CRITICAL', 'ANALYSIS'].includes(result.status) 
      ? result.status 
      : 'NORMAL';
    
    return {
      status: status as 'NORMAL' | 'WARNING' | 'CRITICAL' | 'ANALYSIS',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.99)),
      riskScore: result.riskScore !== undefined ? Math.min(100, Math.max(0, result.riskScore)) : undefined,
      message: result.message || 'Vitals and environment stable.',
      suggestedAction: result.suggestedAction || 'Continue monitoring.',
      source: 'AI_MONITOR'
    };

  } catch (error: any) {
    console.error("❌ [OpenRouter] AI Worker Error:", error);
    
    const errStr = error.message || JSON.stringify(error);
    const isRateLimit = errStr.includes('429') || errStr.includes('402') || errStr.includes('quota') || errStr.includes('limit');
    const isInvalidKey = errStr.includes('401') || errStr.includes('Unauthorized') || errStr.includes('Invalid API key');

    if (isInvalidKey) {
      console.error('🔑 [OpenRouter] Invalid API key. Please check your OPENROUTER_API_KEY in .env.local');
      console.error('   Get a key from: https://openrouter.ai/keys');
    }

    // If rate limited, provide a basic fallback analysis based on telemetry
    if (isRateLimit && recentData.length > 0) {
      console.warn('⚠️ [OpenRouter] Rate limit exceeded. Using fallback analysis.');
      
      // Simple rule-based fallback analysis
      const avgTemp = recentData.reduce((sum, r) => sum + r.temperature, 0) / recentData.length;
      const avgHumidity = recentData.reduce((sum, r) => sum + r.humidity, 0) / recentData.length;
      const avgHR = recentData.reduce((sum, r) => sum + r.heartRate, 0) / recentData.length;
      
      let status: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      let message = 'Monitoring active. AI analysis temporarily unavailable due to API limits.';
      let action = 'Check OpenRouter quota or wait for limit reset.';
      
      // Basic heuristics
      if (avgHR > 100 || avgTemp > 28 || avgHumidity > 80) {
        status = 'WARNING';
        message = 'Elevated readings detected. AI analysis unavailable (API limit).';
        action = 'Monitor vitals manually. Check OpenRouter quota.';
      }
      
      if (avgHR > 120 || avgTemp > 30) {
        status = 'CRITICAL';
        message = 'Critical readings detected. AI analysis unavailable (API limit).';
        action = 'Seek medical attention if symptoms persist. Check OpenRouter quota.';
      }
      
      return {
        status,
        confidence: 0.5, // Lower confidence for fallback
        message: `${message} Using basic rule-based analysis.`,
        suggestedAction: action,
        source: 'AI_MONITOR'
      };
    }

    return {
      status: 'WARNING',
      confidence: 0,
      message: isRateLimit 
        ? 'OpenRouter API Limit Exceeded. Paused.' 
        : isInvalidKey
        ? 'Invalid OpenRouter API Key. Check .env.local'
        : 'AI Worker connection failed.',
      suggestedAction: isRateLimit 
        ? 'Check quota at https://openrouter.ai/keys or wait for limit reset.' 
        : isInvalidKey
        ? 'Update OPENROUTER_API_KEY in .env.local and restart dev server'
        : 'Check network & API Key.',
      source: 'AI_MONITOR'
    };
  }
};

export const analyzeUserReport = async (
  readings: SensorReading[],
  profile?: UserProfile | null,
  weather?: WeatherData | null
): Promise<Omit<AIPrediction, 'id' | 'timestamp'>> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      status: 'ANALYSIS',
      confidence: 1.0,
      riskScore: 100,
      message: 'Simulated: Migraine incident recorded. High heat and elevated heart rate noted prior to report. This pattern has been stored to help detect early warning signs in the future.',
      suggestedAction: 'Move to a cooler area and hydrate.',
      source: 'USER_REPORT'
    };
  }

  const recentData = readings.slice(-60); // Look at a longer window (60s) for user reports
  const profileContext = generateProfileSummary(profile);
  const weatherContext = generateWeatherContext(weather);
  
  const systemInstruction = `You are a Migraine Analysis AI Assistant. The user has just reported experiencing a migraine attack.

Your task is to analyze the sensor data and environmental conditions that preceded this migraine to identify the triggering pattern.

COMMUNICATION STYLE:
- Write in a clear, helpful, and empathetic tone
- Be direct and specific about what likely caused the migraine
- Use simple language - avoid medical jargon
- IMPORTANT: You DO NOT have access to this user's past migraine history. Never mention or invent previous migraine incidents or dates like "similar to your migraine on December 10, 2024".

ANALYSIS APPROACH:
1. Review the sensor readings (heart rate, temperature, humidity) from the last 60 seconds before the report
2. Check weather conditions (barometric pressure is critical)
3. Consider user profile factors (sleep, caffeine, smoking, known triggers)
4. Identify the specific pattern that likely triggered this migraine (based ONLY on the provided data)

MESSAGE FORMAT (2-3 sentences):
- Start with what you found: "Analysis of your migraine incident shows [pattern]."
- Explain the likely trigger: "The combination of [specific factors] likely contributed to this migraine."
- Clearly acknowledge that this migraine has ALREADY occurred and that the system has stored this incident pattern for future early detection.
- End with immediate relief suggestion

You MUST respond with a valid JSON object:
{
  "status": "ANALYSIS",
  "confidence": <number between 0 and 1>,
  "riskScore": <number between 0 and 100>,  // For a reported migraine, risk should be treated as 100 (certain event)
  "message": "<clear analysis of what likely triggered this migraine>",
  "suggestedAction": "<specific immediate relief recommendation>"
}`;

  const userPrompt = `
USER PROFILE:
${profileContext}

WEATHER CONDITIONS AT TIME OF INCIDENT:
${weatherContext}

SENSOR DATA (Last 60 seconds before migraine report):
${JSON.stringify(recentData)}

TASK:
Analyze what likely triggered this migraine based on the sensor readings, weather conditions, and user profile.
- Identify the specific pattern (e.g., "Elevated heart rate (105 BPM) combined with high temperature (30°C) and low barometric pressure (1000 hPa)")
- Explain what likely caused it in clear, user-friendly language
- Recommend immediate relief actions

Return your analysis as JSON with: status, confidence, riskScore (0-100), message, and suggestedAction.
`;

  try {
    const responseText = await callOpenRouter(systemInstruction, userPrompt);
    const result = JSON.parse(responseText);

    // Always treat a user-reported migraine as 100% certain risk.
    const baseMessage = result.message || 'Migraine incident recorded. Analyzing biometric patterns that led up to this attack.';
    // Remove any accidental references to non-existent past migraines (extra safety).
    const cleanedMessage = String(baseMessage).replace(/similar to your migraine on [^.]+\\./gi, '').trim();
    const finalMessage = `${cleanedMessage} The system has stored this incident pattern and will use it to detect early warning signs in the future.`;
    
    return {
      status: 'ANALYSIS',
      confidence: Math.max(0, Math.min(1, result.confidence || 0.99)),
      riskScore: 100,
      message: finalMessage,
      suggestedAction: result.suggestedAction || 'Rest in a dark, quiet room.',
      source: 'USER_REPORT'
    };

  } catch (error: any) {
    console.error("❌ [OpenRouter] AI Worker Error (User Report):", error);
    const errStr = error.message || JSON.stringify(error);
    const isRateLimit = errStr.includes('429') || errStr.includes('402') || errStr.includes('quota');
    const isInvalidKey = errStr.includes('401') || errStr.includes('Unauthorized') || errStr.includes('Invalid API key');

    if (isInvalidKey) {
      console.error('🔑 [OpenRouter] Invalid API key. Please check your OPENROUTER_API_KEY in .env.local');
    }

    return {
      status: 'WARNING',
      confidence: 0,
      riskScore: 100,
      message: isRateLimit 
        ? 'OpenRouter API Limit Exceeded. Paused.' 
        : isInvalidKey
        ? 'Invalid OpenRouter API Key. Check .env.local'
        : 'Failed to analyze user report.',
      suggestedAction: isRateLimit 
        ? 'Check credits.' 
        : isInvalidKey
        ? 'Update OPENROUTER_API_KEY in .env.local and restart dev server'
        : 'Try again later.',
      source: 'USER_REPORT'
    };
  }
};