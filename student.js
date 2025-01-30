const axios = require("axios");
const readlineSync = require("readline-sync");
const FIREWORKS_API_KEY = "fw_3ZYJCLCzqcFn5pDKkMT84i7w";

//tools

function getWeatherDetails(city = " ") {
  if (city.toLowerCase() === "sylhet") return "10°C";
  if (city.toLowerCase() === "dhaka") return "20°C";
  if (city.toLowerCase() === "rangpur") return "15°C";
  if (city.toLowerCase() === "kustia") return "25°C";
  if (city.toLowerCase() === "sirajganj") return "35°C";
}

const tools = {
  getWeatherDetails: getWeatherDetails,
};

const SYSTEM_PROMPT = `You are an AI Assistant with START, PLAN, ACTION, Observation and output State.
Wait for the user prompt and first PLAN using available tools. After planning, Take the action with appropriate tools and wait for Observation based on Action. Once you get the observation,  return the AI response based on START prompt and observations.

Strictly follow the JSON output format as in examples.

Available tools:
- function getWeatherDetails(city: string): string
getWeatherDetails is a function that accepts city name as string and return the weather details. 

Example:
START {"type": "user", "user": "What is the sum of weather of sylhet and dhaka?"} "}
{"type": "plan", "plan": "I will call getWeatherDetails for sylhet"}
{"type": "action", "function": "getWeatherDetails", "input": "sylhet"}
{"type": "observation", "observation": "10°C"}
{"type": "plan", "plan": "I will call the getWeatherDetails tools for dhaka."}
{"type": "action", "function": "getWeatherDetails", "input": "dhaka"}
{"type": "observation", "observation": "20°C"}
{"type": "output", "output": "The sum of weather of sylhet and dhaka is 30°C."}`;

const message = [{ role: "system", content: SYSTEM_PROMPT }];

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

    while (true) {
      try {
        const response = await axios.post(
          "https://api.fireworks.ai/inference/v1/chat/completions",
          {
            messages: message,
            model: "accounts/fireworks/models/llama-v3p1-8b-instruct",
          },
          {
            headers: {
              Authorization: `Bearer ${FIREWORKS_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result = response.data.choices[0].message.content;

        message.push({
          role: "assistant",
          content: result,
        });

        const call = JSON.parse(result);

        if (call.type === "output") {
          console.log(call.output);
          break;
        } else if (call.type === "action") {
          const fn = tools[call.function];
          const observation = fn(call.input);
          const obs = { type: "observation", observation: observation };
          message.push({ role: "developer", content: JSON.stringify(obs) });
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }
}

main();
