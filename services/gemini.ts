
import { GoogleGenAI, Type } from "@google/genai";

// Fix: Always use direct process.env.API_KEY when initializing the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getBookInsights = async (title: string, author: string, query?: string) => {
  const model = ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query 
      ? `Based on the book "${title}" by ${author}, please answer: ${query}` 
      : `Provide a detailed summary and 3 key insights for the book "${title}" by ${author}.`,
    config: {
      responseMimeType: query ? "text/plain" : "application/json",
      responseSchema: query ? undefined : {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyInsights: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          suggestedQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["summary", "keyInsights", "suggestedQuestions"]
      }
    }
  });

  const response = await model;
  return response.text;
};

export const chatWithBook = async (title: string, history: {role: 'user' | 'model', text: string}[]) => {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Nova, an AI Reading Assistant. You have expert knowledge of the book "${title}". Help the user understand deep themes, character motivations, and plot points. Keep answers concise and insightful.`
    }
  });

  const lastMsg = history[history.length - 1].text;
  const result = await chat.sendMessage({ message: lastMsg });
  return result.text;
};
