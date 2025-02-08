import { Ollama } from "ollama";
import readlineSync from "readline-sync";

//tools

function getStudentDetails(name = " ") {
  if (name === "sakib") {
    return "Sakib is a student of CSE department. He is a good student. His CGPA is 3.8";
  }

  if (name === "salim") {
    return "salim is a student of Account department. He is a good student. His CGPA is 3.5";
  }

  if (name === "rafi") {
    return "Rafi is a student of Bangla  department. He is a average student. His CGPA is 2.8";
  }
}

const tools = {
  getStudentDetails: getStudentDetails,
};

const SYSTEM_PROMPT = `You are an AI Assistant with START, PLAN, ACTION, Observation and output State.
Wait for the user prompt and first PLAN using available tools. After planning, Take the action with appropriate tools and wait for Observation based on Action. Once you get the observation,  return the AI response based on START prompt and observations.

Strictly follow the JSON output format as in examples.

Available tools:
- function getStudentDetails(name: string): string
getStudentDetails is a function that accepts  student name as string and return their details. 

Example:
START {"type": "user", "user": "Who they are like sakib and salim  "} "}
{"type": "plan", "plan": "I will call getStudentDetails for sakib"}
{"type": "action", "function": "getStudentDetails", "input": "sakib"}
{"type": "observation", "observation": "good student"}
{"type": "plan", "plan": "I will call the getStudentDetails tools for salim."}
{"type": "action", "function": "getStudentDetails", "input": "salim"}
{"type": "observation", "observation": "good student"}
{"type": "output", "output": "Their CGPA is a 3.5."}
{"type": "plan", "plan": "I will call the getStudentDetails function to retrieve students count."}
{"type": "action", "function": "getStudentDetails", "input": "how many students"}
{"type": "observation", "observation": "I will call the getStudentDetails function to count all student."}
{"type": "output", "output": "there are 2 students."}`;

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
