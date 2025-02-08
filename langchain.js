// langchain.js
import { ChromaClient } from "chromadb";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Ollama } from "@langchain/community/llms/ollama";
import readline from "readline";

// Configuration
const config = {
  chroma: {
    url: "http://localhost:8888",
    collection: "conversation_history",
    embeddingSize: 1536,
  },
  ollama: {
    url: "http://localhost:11434",
    model: "llama3.2:1b",
  },
};

// Utility functions
const createEmbedding = (size) => new Array(size).fill(0);
const logError = (context, error) =>
  console.error(`Error in ${context}:`, error);
const formatResponse = (response) => console.log("\nAI:", response, "\n");

// Core functions
const initializeChroma = async () => {
  const chroma = new ChromaClient({ path: config.chroma.url });
  try {
    return await chroma.getCollection({ name: config.chroma.collection });
  } catch {
    return await chroma.createCollection({ name: config.chroma.collection });
  }
};

const initializeAI = () => ({
  llm: new Ollama({
    baseUrl: config.ollama.url,
    model: config.ollama.model,
  }),
  parser: new StringOutputParser(),
});

const getContext = async (collection, input) => {
  const embedding = createEmbedding(config.chroma.embeddingSize);
  const result = await collection.query({
    queryEmbeddings: [embedding],
    nResults: 2,
  });
  return result?.documents?.[0] || "No previous context";
};

const generateResponse = async (llm, prompt, context, input) => {
  console.log("\nThinking...");
  return llm.invoke(
    await prompt.format({
      context,
      input,
    })
  );
};

const storeConversation = async (collection, input, response) => {
  const embedding = createEmbedding(config.chroma.embeddingSize);
  await collection.add({
    ids: [Date.now().toString()],
    documents: [`${input}\n${response}`],
    metadatas: [{ type: "conversation" }],
    embeddings: [embedding],
  });
};

const createPrompt = () =>
  ChatPromptTemplate.fromTemplate(`
  Previous Context: {context}
  Human: {input}
  Assistant: Let me help you with that.
`);

const processUserInput = async (input, { collection, llm }) => {
  try {
    const prompt = createPrompt();
    const context = await getContext(collection, input);
    const response = await generateResponse(llm, prompt, context, input);
    await storeConversation(collection, input, response);
    return response;
  } catch (error) {
    logError("chat processing", error);
    throw error;
  }
};

const createInterface = () =>
  readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

const askQuestion = (rl) =>
  new Promise((resolve) => {
    rl.question("\nYou: ", resolve);
  });

// Main chat loop
const startChat = async () => {
  try {
    const collection = await initializeChroma();
    const ai = initializeAI();
    const rl = createInterface();

    console.log("\nChat initialized. Type 'exit' to quit.\n");

    while (true) {
      const input = await askQuestion(rl);
      if (input.toLowerCase() === "exit") break;

      const response = await processUserInput(input, { collection, ...ai });
      formatResponse(response);
    }

    rl.close();
  } catch (error) {
    logError("main", error);
    process.exit(1);
  }
};

// Start the application
startChat();
