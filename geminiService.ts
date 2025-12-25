import { GoogleGenAI } from "@google/genai";
import { Message } from "./types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageToGemini = async (history: Message[], newMessage: string): Promise<string> => {
  try {
    const chatHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }));

    // Replaced gemini-2.5-flash with gemini-3-flash-preview as per guidelines for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...chatHistory, { role: 'user', parts: [{ text: newMessage }] }],
      config: {
        systemInstruction: "You are a helpful, witty, and slightly mysterious AI assistant living in a secure encrypted vault. Keep responses concise and engaging.",
      }
    });

    // Directly access .text property from GenerateContentResponse
    return response.text || "I couldn't decrypt a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection to the neural link failed. Please try again.";
  }
};

export const getAuthHelp = async (field: string): Promise<string> => {
    try {
        // Updated model and used .text property for extraction
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Write a 1-sentence poetic noir tip about why '${field}' is important for privacy in a secure chat app.`,
        });
        return response.text?.trim() || "Secure your identity, shadow walker.";
    } catch (e) {
        return "Secure your identity, shadow walker.";
    }
};