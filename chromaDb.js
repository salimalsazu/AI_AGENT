import { ChromaClient } from "chromadb";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Ollama } from "@langchain/community/llms/ollama";
import readline from "readline";

class AIAgent {
  constructor() {
    this.chroma = new ChromaClient({ path: "http://localhost:8888" });
    this.llm = new Ollama({
      baseUrl: "http://localhost:11434",
      model: "llama3.2:1b",
    });
    this.collection = null;
    this.parser = new StringOutputParser();
  }

  async init() {
    try {
      this.collection = await this.chroma.getCollection({
        name: "conversation_history",
      });
    } catch {
      this.collection = await this.chroma.createCollection({
        name: "conversation_history",
      });
    }
  }

  async chat(userInput) {
    try {
      const prompt = ChatPromptTemplate.fromTemplate(`
        Previous Context: {context}
        Human: {input}
        Assistant: Let me help you with that.
      `);

      const defaultEmbedding = new Array(1536).fill(0);
      const context = await this.collection.query({
        queryEmbeddings: [defaultEmbedding],
        nResults: 2,
      });

      console.log("\nThinking...");
      const response = await this.llm.invoke(
        await prompt.format({
          context: context?.documents?.[0] || "No previous context",
          input: userInput,
        })
      );

      await this.collection.add({
        ids: [Date.now().toString()],
        documents: [`${userInput}\n${response}`],
        metadatas: [{ type: "conversation" }],
        embeddings: [defaultEmbedding],
      });

      return response;
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }
}

// Interactive chat interface
async function startChat() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const agent = new AIAgent();
  await agent.init();
  console.log("\nChat initialized. Type 'exit' to quit.\n");

  const askQuestion = () => {
    return new Promise((resolve) => {
      rl.question("\nYou: ", async (input) => {
        if (input.toLowerCase() === "exit") {
          rl.close();
          resolve(false);
          return;
        }

        try {
          const response = await agent.chat(input);
          console.log("\nAI:", response, "\n");
        } catch (error) {
          console.error("\nError:", error);
        }
        resolve(true);
      });
    });
  };

  let continuing = true;
  while (continuing) {
    continuing = await askQuestion();
  }
}

startChat().catch(console.error);
