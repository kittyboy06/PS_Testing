/**
 * Fetch all available Gemini models that support content generation using the provided API Key.
 */
export async function fetchAvailableModels(apiKey) {
  if (!apiKey) throw new Error("Gemini API Key is required.");
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  
  if (!response.ok) {
    if (response.status === 400) {
      throw new Error("Invalid Gemini API Key or bad request.");
    } else {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
  }
  
  const data = await response.json();
  
  // Filter models that support content generation (generateContent)
  // We want to list model options that make sense for general text/code tasks
  // Filter out embeddings, AQA, or translation-only models if any
  const textModels = (data.models || [])
    .filter(model => {
      const supportsGenerate = model.supportedGenerationMethods?.includes("generateContent");
      // Exclude embedding and specialized text models to keep list clean, but let's be inclusive of major models
      const name = model.name.toLowerCase();
      const isEmbedding = name.includes("embed") || name.includes("similarity");
      return supportsGenerate && !isEmbedding;
    })
    .map(model => {
      // Return a clean, sorted object
      return {
        id: model.name, // e.g. "models/gemini-1.5-flash"
        displayName: model.displayName || model.name.replace("models/", ""),
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit
      };
    });
    
  // Sort models: prioritize newer/flash/pro models at the top
  textModels.sort((a, b) => {
    const aName = a.id.toLowerCase();
    const bName = b.id.toLowerCase();
    
    // Sort logic (pro and flash first, then alphabetical)
    if (aName.includes("pro") && !bName.includes("pro")) return -1;
    if (!aName.includes("pro") && bName.includes("pro")) return 1;
    if (aName.includes("2.5") && !bName.includes("2.5")) return -1;
    if (!aName.includes("2.5") && bName.includes("2.5")) return 1;
    if (aName.includes("2.0") && !bName.includes("2.0")) return -1;
    if (!aName.includes("2.0") && bName.includes("2.0")) return 1;
    
    return aName.localeCompare(bName);
  });
  
  return textModels;
}

/**
 * Execute the code evaluation prompt against the selected Gemini model.
 */
export async function runCodeEvaluation(apiKey, modelId, repoData, problemStatement, evaluationCriteria) {
  if (!apiKey) throw new Error("Gemini API Key is required.");
  if (!modelId) throw new Error("Gemini Model selection is required.");
  if (!repoData || !repoData.files || repoData.files.length === 0) {
    throw new Error("No repository file content found to evaluate.");
  }
  
  // Format the file contents into a readable structure for the prompt
  let filesContext = "";
  repoData.files.forEach(file => {
    filesContext += `=========================================\n`;
    filesContext += `FILE: ${file.path}\n`;
    filesContext += `=========================================\n`;
    filesContext += `${file.content}\n\n`;
  });
  
  const systemInstruction = `You are a strict, objective, and highly pedantic AI code evaluator grading a student's project submission.
Your grading must be extremely rigorous and objective. Do NOT inflate marks. Give marks ONLY if the features are fully, cleanly, and completely implemented.
You must return your evaluation in JSON format matching the schema requested. No other text or markdown wrapping.`;

  // Build the prompt content
  const prompt = `Evaluate the student's project codebase based on the following context and guidelines.

=========================================
TARGET PROBLEM STATEMENT: ${problemStatement.id} - ${problemStatement.title}
=========================================
Description:
${problemStatement.description}

Required Features to verify:
${problemStatement.features.map(f => `- ${f}`).join("\n")}

=========================================
EVALUATION RUBRIC & CRITERIA (Total: 100 Marks)
=========================================
${evaluationCriteria.map(c => `- ${c.name} (Max: ${c.maxMarks} Marks): ${c.description}`).join("\n")}

=========================================
STUDENT PROJECT CODEBASE:
=========================================
Repository: ${repoData.owner}/${repoData.repo} (${repoData.branch} branch)
Total Files scanned: ${repoData.files.length}

${filesContext}

=========================================
GRADING AND INSTRUCTIONS:
=========================================
1. Verify functional completeness of EACH required feature list by examining the files.
2. Verify database integration (e.g. SQLite, PostgreSQL, Supabase, Firebase, local storage mock DB, JSON/localStorage). Look for database setup code, migrations, schemas, and queries/mutations.
3. Review UI styling, responsive design patterns, HTML structures, and CSS files.
4. Assess code quality: is the folder structured cleanly? Are components reusable? Is code readably organized?
5. Look for Creativity: did they implement any additional custom features or unique designs?
6. Check for Validations: are form inputs validated? Are edge cases caught? Are there try-catch blocks and error messages?
7. Check Presentation/Git: check the README.md content, setup instructions, and clarity.

Return a JSON object containing:
{
  "overallScore": number (calculated as the sum of the 7 criteria scores),
  "criteriaBreakdown": {
    "functionalCompleteness": {
      "score": number (0 to 30),
      "critique": "Detailed explanation of what was implemented, what was missing, and why these marks were given."
    },
    "databaseIntegration": {
      "score": number (0 to 15),
      "critique": "Detailed critique of the database setup, schema, integration, and CRUD logic."
    },
    "uiUxDesign": {
      "score": number (0 to 15),
      "critique": "Detailed critique of UI layout, styling files, responsiveness, theme coordination, and overall presentation."
    },
    "codeQuality": {
      "score": number (0 to 10),
      "critique": "Critique of organization, naming conventions, readability, comments, and structure."
    },
    "creativityInnovation": {
      "score": number (0 to 10),
      "critique": "Evaluation of unique features, design touches, or outstanding technical elements."
    },
    "validationErrorHandling": {
      "score": number (0 to 10),
      "critique": "Critique of validation checks (regex, forms) and error-catching/notification behaviors."
    },
    "gitWorkflowPresentation": {
      "score": number (0 to 10),
      "critique": "Critique of the README documentation, setup guidelines, and project organization details."
    }
  },
  "featuresEvaluated": [
    {
      "feature": "Name of target feature",
      "status": "Implemented" | "Partially Implemented" | "Missing",
      "details": "Evidence/locations found or details on what is missing."
    }
  ],
  "improvements": [
    {
      "issue": "Specific bug, design flaw, or missing detail",
      "severity": "High" | "Medium" | "Low",
      "suggestion": "Clear description of how to fix this issue"
    }
  ],
  "summaryFeedback": "A concise concluding summary (2-3 sentences) on the overall project status."
}

Do NOT include any wrapping characters like \`\`\`json or markdown headers. Just return pure JSON text.`;

  // Prepare call to Gemini API
  // We clean the model name to verify v1beta request URL matches: e.g. models/gemini-2.0-flash -> /v1beta/models/gemini-2.0-flash:generateContent
  // The model ID returned in fetchAvailableModels starts with "models/"
  const cleanModelId = modelId.startsWith("models/") ? modelId : `models/${modelId}`;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${cleanModelId}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    systemInstruction: {
      parts: [
        { text: systemInstruction }
      ]
    },
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1, // Low temperature for consistent, strict grading
      topP: 0.95
    }
  };
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText || response.statusText}`);
  }
  
  const result = await response.json();
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!textResponse) {
    throw new Error("Gemini returned an empty response.");
  }
  
  try {
    // Parse response
    const parsedData = JSON.parse(textResponse.trim());
    return parsedData;
  } catch (parseError) {
    console.error("Failed to parse JSON response from Gemini:", textResponse);
    throw new Error("Failed to parse grading report. The AI response was not in the expected JSON format.");
  }
}
