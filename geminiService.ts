import { GoogleGenAI } from "@google/genai";
import { Message } from "./types";

// Initialize Gemini Client
// Assumption: process.env.API_KEY is available in the build environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const sendMessageToGemini = async (history: Message[], newMessage: string): Promise<string> => {
  try {
    // Transform our internal message format to the API format if needed,
    // but typically we can just use a fresh model call with history context if we were managing state manually.
    // For simplicity and robustness with the new SDK, we'll use the Chat helper.
    
    // Construct history for the chat
    const chatHistory = history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: chatHistory,
      config: {
        systemInstruction: "You are a helpful, witty, and slightly mysterious AI assistant living in a secure encrypted vault. Keep responses concise and engaging.",
      }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I couldn't decrypt a response.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Connection to the neural link failed. Please try again.";
  }
};
