import { GoogleGenAI } from "@google/genai";

export async function diagnoseDisease(imageData: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `You are a professional plant pathologist and agronomist. 
You will be provided with an image of a plant leaf and its Excess Green Index (ExG) processed version.
Your task is to identify the disease (if any) and provide:
1. Disease Name (and Scientific Name if applicable)
2. Confidence Score (0-100%)
3. Symptoms observed
4. Primary Causes (e.g., fungus, bacteria, pests, nutrient deficiency)
5. Treatment Plan (Chemical, Organic, and Cultural practices)
6. Prevention Tips for next season.

Reference the PlantVillage dataset standards for classification. 
Return your response in clean Markdown.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: imageData, mimeType } },
        { text: "Analyze this crop leaf for diseases. Note the non-green areas highlighted in the ExG process." }
      ]
    },
    config: {
      systemInstruction,
      temperature: 0.2,
    }
  });

  return response.text;
}
