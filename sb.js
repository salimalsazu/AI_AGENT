import { Ollama } from "ollama";
import readlineSync from "readline-sync";
import { OpenAI } from "langchain/llms/openai";
import { ChromaClient } from "chroma-js";

const ollama = new Ollama({ host: "http://localhost:11434" });

const llm = new OpenAI({ temperature: 0 });

const chromaClient = new ChromaClient({
  host: "localhost",
  port: 8888, // Adjust port if necessary
});

// Tools section

function getStudentDetails(name = " ") {
  if (name === "sakib") {
    return "Sakib is a student of CSE department. He is a good student. His CGPA is 3.8";
  }

  if (name === "salim") {
    return "salim is a student of Account department. He is a good student. His CGPA is 3.5";
  }

  if (name === "rafi") {
    return "Rafi is a student of Bangla department. He is an average student. His CGPA is 2.8";
  }

  return "Student not found";
}

// New async tool that integrates LangChain for advanced student info
async function searchAdvancedStudentInfo(query) {
  // Placeholder DB info
  let dbInfo = "Placeholder DB: connection established. (Dummy info)";

  // Query LangChain for further details
  const prompt = `Retrieve detailed student information for query: "${query}". Using DB info: ${dbInfo}`;
  const llmResponse = await llm.call(prompt);
  return `Advanced Info:\n${llmResponse}`;
}

// New async tool that queries Chroma DB using chromaClient
async function searchChromaDB(query) {
  try {
    // Example: assume chromaClient has a method getCollections that returns an array of collection names
    const collections = await chromaClient.getCollections();
    return `Chroma DB query result for "${query}": Available collections: ${collections.join(
      ", "
    )}`;
  } catch (err) {
    return "Error querying Chroma DB.";
  }
}

const tools = {
  getStudentDetails,
  searchAdvancedStudentInfo,
  searchChromaDB,
};

const SYSTEM_PROMPT = `You are an AI Assistant with START, PLAN, ACTION, Observation and output State.
Wait for the user prompt and first PLAN using available tools. After planning, take the action with appropriate tools and wait for Observation based on Action. Once you get the observation, return the AI response based on START prompt and observations.

Strictly follow the JSON output format as in examples.

Available tools:
- function getStudentDetails(name: string): string
  This function returns basic details of a student given their name.
- async function searchAdvancedStudentInfo(query: string): string
  This function uses LangChain to fetch advanced student information.
- async function searchChromaDB(query: string): string
  This function queries the Chroma DB using the chromaClient to get additional information.

Example:
START {"type": "user", "user": "Tell me about sakib"}
{"type": "plan", "plan": "I will call getStudentDetails for sakib"}
{"type": "action", "function": "getStudentDetails", "input": "sakib"}
{"type": "observation", "observation": "Sakib is a student of CSE department..."}
{"type": "plan", "plan": "I will call searchAdvancedStudentInfo for more details on sakib"}
{"type": "action", "function": "searchAdvancedStudentInfo", "input": "advanced details for sakib"}
{"type": "observation", "observation": "Extended info from LangChain."}
{"type": "plan", "plan": "I will call searchChromaDB to check the DB collections."}
{"type": "action", "function": "searchChromaDB", "input": "list collections"}
{"type": "observation", "observation": "Chroma DB returned available collections."}
{"type": "output", "output": "Sakib is a highly performing student in the CSE department with exceptional skills."}`;

const message = [{ role: "system", content: SYSTEM_PROMPT }];

function parseJSONStrings(str) {
  const regex = /({[^]*?})/g;
  const matches = str.match(regex);
  if (!matches) return [];

  const results = [];
  for (const match of matches) {
    try {
      results.push(JSON.parse(match));
    } catch (err) {
      // ignore parsing errors
    }
  }
  return results;
}

async function main() {
  while (true) {
    const query = readlineSync.question(">> ");
    const q = {
      type: "user",
      user: query,
    };
    message.push({
      role: "user",
      content: JSON.stringify(q),
    });

    let queryDone = false;
    while (!queryDone) {
      try {
        const response = await ollama.chat({
          model: "llama3.2:1b",
          messages: message,
          stream: false,
        });

        const result = response?.message?.content.trim() || "";

        message.push({
          role: "assistant",
          content: result,
        });

        const jsonObjects = parseJSONStrings(result);

        for (const call of jsonObjects) {
          if (call.type === "output") {
            console.log(call.output);
            queryDone = true;
            break;
          } else if (call.type === "action") {
            const fn = tools[call.function];
            if (fn) {
              const observation = await fn(call.input);
              const obs = { type: "observation", observation: observation };
              message.push({ role: "developer", content: JSON.stringify(obs) });
            } else {
              console.error(`Error: function "${call.function}" not found.`);
            }
          }
        }
      } catch (error) {
        console.error("Error:", error);
        break;
      }
    }
  }
}

main();
