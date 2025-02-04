import ollama from "ollama";
import readlineSync from "readline-sync";

// Tools
function getWeatherDetails(city = "") {
  const weatherData = {
    sylhet: "10°C",
    dhaka: "20°C",
    rangpur: "15°C",
    kustia: "25°C",
  };
  return weatherData[city.toLowerCase()] || "Unknown city";
}

const tools = { getWeatherDetails };

const SYSTEM_PROMPT = `
You are an AI Assistant that only responds with valid JSON. Do not include any explanations, thoughts, or extra text—only return JSON objects.
Strictly follow this format:

Example:
{"type": "user", "user": "What is the sum of weather of sylhet and dhaka?"}
{"type": "plan", "plan": "I will call getWeatherDetails for sylhet"}
{"type": "action", "function": "getWeatherDetails", "input": "sylhet"}
{"type": "observation", "observation": "10°C"}
{"type": "plan", "plan": "I will call getWeatherDetails for dhaka"}
{"type": "action", "function": "getWeatherDetails", "input": "dhaka"}
{"type": "observation", "observation": "20°C"}
{"type": "output", "output": "The sum of the weather of Sylhet and Dhaka is 30°C."}
Only return structured JSON objects in the response.
`;

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

async function main() {
  while (true) {
    const query = readlineSync.question(">> ");
    const userMessage = { type: "user", user: query };
    messages.push({ role: "user", content: JSON.stringify(userMessage) });

    while (true) {
      try {
        const response = await ollama.chat({
          model: "deepseek-r1:1.5b",
          messages: messages,
          stream: false,
        });

        console.log("Full Response:", response);

        if (
          !response ||
          !response.message ||
          typeof response.message.content !== "string"
        ) {
          console.error("Unexpected response format:", response);
          break;
        }

        let result = response.message.content;

        // Find the first JSON object
        let jsonStart = result.indexOf("{");
        if (jsonStart === -1) {
          console.error("Invalid response format, no JSON found.");
          break;
        }

        // Extract only the JSON part
        result = result.substring(jsonStart);

        // Split multiple JSON objects and parse them one by one
        let jsonObjects = result
          .split("\n")
          .filter((line) => line.trim().startsWith("{"));

        const call = JSON.parse(result);
        messages.push({ role: "assistant", content: JSON.stringify(call) });
        try {
          for (let jsonStr of jsonObjects) {
            let call = JSON.parse(jsonStr);

            if (call.type === "output") {
              console.log(call.output);
              break;
            } else if (call.type === "action") {
              const fn = tools[call.function];
              const observation = fn(call.input);
              const obs = { type: "observation", observation: observation };
              message.push({ role: "developer", content: JSON.stringify(obs) });
            }
          }
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
        }
      } catch (error) {
        console.error("Error:", error);
        break;
      }
    }
  }
}

main();
