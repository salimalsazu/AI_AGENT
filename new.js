import readlineSync from "readline-sync";
import { Ollama } from "ollama";

function getWeatherDetails(city = "") {
  if (city.toLowerCase() === "sylhet") return "10°C";
  if (city.toLowerCase() === "dhaka") return "20°C";
  if (city.toLowerCase() === "rangpur") return "15°C";
  if (city.toLowerCase() === "kustia") return "25°C";
  return "Unknown city";
}

// Add a dummy getUserName function
function getUserName() {
  return "User";
}

const tools = {
  getWeatherDetails: getWeatherDetails,
  getUserName: getUserName,
};

const SYSTEM_PROMPT = `
You are an AI Assistant with START, PLAN, ACTION, Observation and output State.
Wait for the user prompt and first PLAN using available tools. After planning, Take the action with appropriate tools and wait for Observation based on Action. Once you get the observation, return the AI response based on START prompt and observations.

Strictly follow the JSON output format as in examples.

Available tools:
- function getWeatherDetails(city: string): string
getWeatherDetails is a function that accepts city name as string and returns the weather details. 

Example:
START {"type": "user", "user": "if user ask me anything"}
{"type": "plan", "plan": "I will response him"}
{"type": "observation", "observation": "ex: Hello, hi etc"}
{"type": "output", "output": "I will response him"}
{"type": "user", "user": "What is the sum of weather of sylhet and dhaka?"}
{"type": "plan", "plan": "I will call getWeatherDetails for sylhet"}
{"type": "action", "function": "getWeatherDetails", "input": "sylhet"}
{"type": "observation", "observation": "10°C"}
{"type": "plan", "plan": "I will call the getWeatherDetails tools for dhaka."}
{"type": "action", "function": "getWeatherDetails", "input": "dhaka"}
{"type": "observation", "observation": "20°C"}
{"type": "output", "output": "The sum of weather of sylhet and dhaka is 30°C."}
`;

const message = [{ role: "system", content: SYSTEM_PROMPT }];
const ollama = new Ollama({ host: "http://localhost:11434" });

function parseJSONStrings(str) {
  const regex = /({[^]*?})/g;
  const matches = str.match(regex);
  if (!matches) return [];

  const results = [];
  for (const match of matches) {
    try {
      results.push(JSON.parse(match));
    } catch (err) {}
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
          // console.log("Call:", call);

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
/// Function to get the
main();
