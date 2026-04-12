import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const getAIResponse = async (userMessage: string, userName: string, gameName: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: `You are a helpful customer support agent for "PROHACK", a premium game prediction and hack service. 
        The user's name is ${userName} and they are interested in the game ${gameName}.
        
        Rules:
        1. Be professional, friendly, and helpful.
        2. Keep responses short and concise (1-2 sentences).
        3. If they ask how to buy, tell them to select a plan from the pricing section and scan the QR code.
        4. If they ask if it's safe, mention our Anti-Ban protection.
        5. Do not mention that you are an AI. Act as a real human support agent.
        6. Use a bit of Hinglish (Hindi + English) as the target audience is Indian.
        
        Example: "Hello ${userName}! How can I help you with ${gameName} today?"`
      }
    });

    return response.text || "I'm here to help! What can I do for you?";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I'm having a bit of trouble connecting. Please try again or wait for a human agent.";
  }
};
