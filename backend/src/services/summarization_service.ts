import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/gpt-4o-mini`, // Replace with your deployment name
  defaultHeaders: {
    "api-key": process.env.AZURE_OPENAI_API_KEY!,
  },
});

export async function summarizeConversation(conversation: string): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Replace with your deployed model name
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that summarizes customer conversations in 4-5 concise lines.",
        },
        {
          role: "user",
          content: `Summarize this conversation:\n\n${conversation}`,
        },
      ],
      max_tokens: 200,
    });

    return response.choices[0].message?.content || "No summary generated.";
  } catch (error) {
    console.error("Error summarizing conversation:", error);
    throw error;
  }
}
