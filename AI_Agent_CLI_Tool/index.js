import "dotenv/config";
import axios from "axios";
import { OpenAI } from "openai";
import { exec } from "child_process";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import fs from "fs/promises";
import path from "path";

let client;
let jsonModeSupported = true;

async function getTheWeatherOfCity(cityname = "") {
  const city = cityname.trim().toLowerCase();
  if (!city) {
    return "City name is required.";
  }
  const url = `https://wttr.in/${city}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: "text" });
  return `The Weather of ${cityname} is ${data}`;
}

async function getGithubDetailsAboutUser(username = "") {
  const user = username.trim();
  if (!user) {
    return "GitHub username is required.";
  }
  const url = `https://api.github.com/users/${user}`;
  const { data } = await axios.get(url);
  return {
    login: data.login,
    name: data.name,
    blog: data.blog,
    public_repos: data.public_repos
  };
}

async function executeCommand(cmd = "") {
  return new Promise((resolve) => {
    if (!cmd || typeof cmd !== "string") {
      resolve("Command must be a non-empty string.");
      return;
    }

    exec(cmd, { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        resolve(`Command failed: ${error.message}\n${stderr || ""}`.trim());
        return;
      }
      resolve((stdout || stderr || "Command executed successfully.").trim());
    });
  });
}

async function writeFileTool(args = {}) {
  const { filePath, content } = args;
  if (!filePath || typeof content !== "string") {
    return "writeFile requires { filePath, content }";
  }

  const absolutePath = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf-8");
  return `File written: ${absolutePath}`;
}

async function createDirectoryTool(args = {}) {
  const { dirPath } = args;
  if (!dirPath) {
    return "createDirectory requires { dirPath }";
  }
  const absolutePath = path.resolve(process.cwd(), dirPath);
  await fs.mkdir(absolutePath, { recursive: true });
  return `Directory ready: ${absolutePath}`;
}

const toolMap = {
  getTheWeatherOfCity,
  getGithubDetailsAboutUser,
  executeCommand,
  writeFile: writeFileTool,
  createDirectory: createDirectoryTool
};

const systemPrompt = `
You are an AI Assistant that MUST operate in strict JSON format and in a multi-step loop.
You reason in this sequence: START -> THINK (one or more) -> TOOL (if needed) -> OBSERVE -> THINK ... -> OUTPUT.

Primary capability:
- Build webpage output files using HTML/CSS/JavaScript when asked.
- Always create separate files (index.html, styles.css, script.js) and ensure they are runnable in browser.

Available tools:
1. getTheWeatherOfCity(cityname: string)
2. getGithubDetailsAboutUser(username: string)
3. executeCommand(cmd: string)
4. createDirectory({ "dirPath": string })
5. writeFile({ "filePath": string, "content": string })

Rules:
1. Always return a valid JSON object, no markdown.
2. JSON shape:
{
  "step": "START | THINK | TOOL | OUTPUT",
  "content": "string",
  "tool_name": "string (only for TOOL)",
  "tool_args": "string | object (only for TOOL)"
}
3. Use one step per response.
4. For TOOL step, choose one tool only.
5. Wait for OBSERVE input before next decision.
6. For website-generation tasks, do not stop until all required files are created.
7. Keep OUTPUT concise and mention generated file paths.
8. Never generate one-line HTML/CSS/JS; provide properly structured, formatted code.
9. For webpage requests, generate substantial styling and semantic markup (multiple sections and classes).
10. For webpage generation, finish in this practical order:
   - createDirectory for target folder
   - writeFile for index.html
   - writeFile for styles.css
   - writeFile for script.js
   - OUTPUT summarizing paths
`;

function parseJsonSafely(text) {
  const trimmed = (text || "").trim();
  try {
    return { ok: true, data: JSON.parse(trimmed) };
  } catch (error) {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      try {
        return { ok: true, data: JSON.parse(candidate) };
      } catch {
        return { ok: false, error: error.message };
      }
    }
    return { ok: false, error: error.message };
  }
}

async function oneShotWebsiteBuild(userPrompt) {
  const prompt = `
Return ONLY one JSON object:
{
  "folder": "string",
  "indexHtml": "string",
  "stylesCss": "string",
  "scriptJs": "string"
}

Task:
${userPrompt}

Constraints:
- Generate production-like, formatted code (not minified).
- Semantic HTML with header, hero, footer.
- Responsive CSS with desktop/mobile behavior.
- Valid JS (can be minimal).
- Default folder should be "scaler_clone" when cloning Scaler-like landing page.
`;

  const basePayload = {
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  };

  let response;
  try {
    response = await client.chat.completions.create({
      ...basePayload,
      response_format: { type: "json_object" }
    });
  } catch {
    response = await client.chat.completions.create(basePayload);
  }

  const content = response.choices?.[0]?.message?.content?.trim() || "";
  const parsed = parseJsonSafely(content);
  if (!parsed.ok || !parsed.data) {
    throw new Error("One-shot generation failed: invalid JSON.");
  }

  const data = parsed.data;
  const folder = String(data.folder || "scaler_clone").trim() || "scaler_clone";
  const indexHtml = String(data.indexHtml || "");
  const stylesCss = String(data.stylesCss || "");
  const scriptJs = String(data.scriptJs || "");

  if (!indexHtml || !stylesCss || !scriptJs) {
    throw new Error("One-shot generation failed: missing file contents.");
  }

  console.log("[START] One-shot low-credit website generation");
  console.log("[THINK] Generate all file contents in one model call");
  console.log("[TOOL] Calling createDirectory");
  const dirResult = await createDirectoryTool({ dirPath: folder });
  console.log(`[OBSERVE] ${dirResult}`);

  const files = [
    { name: "index.html", content: indexHtml },
    { name: "styles.css", content: stylesCss },
    { name: "script.js", content: scriptJs }
  ];

  for (const file of files) {
    console.log("[TOOL] Calling writeFile");
    const writeResult = await writeFileTool({
      filePath: `${folder}/${file.name}`,
      content: file.content
    });
    console.log(`[OBSERVE] ${writeResult}`);
  }

  console.log(
    `[OUTPUT] Website generated in ${folder} with files: ${folder}/index.html, ${folder}/styles.css, ${folder}/script.js`
  );
}

async function runAgentForPrompt(userPrompt) {
  const lowCreditMode = (process.env.LOW_CREDIT_MODE || "true").toLowerCase() === "true";
  const websiteIntent = /(website|landing page|html|css|javascript|js|clone)/i.test(userPrompt);
  if (lowCreditMode && websiteIntent) {
    await oneShotWebsiteBuild(userPrompt);
    return;
  }

  const fileProgress = {
    html: false,
    css: false,
    js: false
  };

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  let guard = 0;
  let invalidJsonCount = 0;
  while (guard < 120) {
    guard += 1;

    let response;
    const requestPayload = {
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages,
      temperature: 0.2
    };
    try {
      response = await client.chat.completions.create(
        jsonModeSupported
          ? {
              ...requestPayload,
              response_format: { type: "json_object" }
            }
          : requestPayload
      );
    } catch (error) {
      if (jsonModeSupported && String(error.message || "").includes("response_format")) {
        jsonModeSupported = false;
        response = await client.chat.completions.create(requestPayload);
      } else {
        throw error;
      }
    }

    const content = response.choices?.[0]?.message?.content?.trim() || "";
    const parsed = parseJsonSafely(content);

    if (!parsed.ok) {
      invalidJsonCount += 1;
      console.log(`[OBSERVE] Invalid JSON from model (attempt ${invalidJsonCount})`);
      const fallback = {
        step: "OBSERVE",
        content:
          "Invalid JSON output. Return ONLY one valid JSON object with step, content, and tool fields when required."
      };
      messages.push({ role: "developer", content: JSON.stringify(fallback) });
      if (invalidJsonCount >= 8) {
        messages.push({
          role: "developer",
          content: JSON.stringify({
            step: "OBSERVE",
            content:
              "Too many invalid JSON responses. Provide a valid OUTPUT step now summarizing completed files."
          })
        });
      }
      continue;
    }

    const stepData = parsed.data;
    if (typeof stepData.step === "string") {
      stepData.step = stepData.step.toUpperCase().trim();
    }
    messages.push({ role: "assistant", content: JSON.stringify(stepData) });

    if (stepData.step === "START" || stepData.step === "THINK") {
      console.log(`[${stepData.step}] ${stepData.content}`);
      continue;
    }

    if (stepData.step === "TOOL") {
      const toolName = stepData.tool_name;
      const toolArgs = stepData.tool_args;
      console.log(`[TOOL] Calling ${toolName}`);

      if (!toolMap[toolName]) {
        const observe = { step: "OBSERVE", content: `Tool not available: ${toolName}` };
        console.log(`[OBSERVE] ${observe.content}`);
        messages.push({ role: "developer", content: JSON.stringify(observe) });
        continue;
      }

      try {
        const result = await toolMap[toolName](toolArgs);
        if (toolName === "writeFile" && toolArgs && typeof toolArgs === "object") {
          const filePath = String(toolArgs.filePath || "").toLowerCase();
          if (filePath.endsWith("index.html")) fileProgress.html = true;
          if (filePath.endsWith("styles.css")) fileProgress.css = true;
          if (filePath.endsWith("script.js")) fileProgress.js = true;
        }
        const observe = { step: "OBSERVE", content: result };
        console.log(`[OBSERVE] ${typeof result === "string" ? result : JSON.stringify(result)}`);
        messages.push({ role: "developer", content: JSON.stringify(observe) });
        if (fileProgress.html && fileProgress.css && fileProgress.js) {
          messages.push({
            role: "developer",
            content: JSON.stringify({
              step: "OBSERVE",
              content:
                "All required webpage files are created successfully (index.html, styles.css, script.js). Return OUTPUT now."
            })
          });
        }
      } catch (error) {
        const observe = { step: "OBSERVE", content: `Tool execution error: ${error.message}` };
        console.log(`[OBSERVE] ${observe.content}`);
        messages.push({ role: "developer", content: JSON.stringify(observe) });
      }
      continue;
    }

    if (stepData.step === "OUTPUT") {
      console.log(`[OUTPUT] ${stepData.content}`);
      return;
    }

    const unknown = { step: "OBSERVE", content: `Unknown step: ${stepData.step}` };
    messages.push({ role: "developer", content: JSON.stringify(unknown) });
  }

  console.log("[OUTPUT] Stopped due to safety guard (too many iterations). Try a shorter prompt.");
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY in environment. Add it in .env");
    process.exit(1);
  }
  client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1"
  });

  const rl = readline.createInterface({ input, output });
  console.log("AI Agent CLI Tool");
  console.log('Type your instruction. Type "exit" to quit.\n');

  try {
    while (true) {
      const prompt = await rl.question("You > ");
      const trimmed = prompt.trim();

      if (!trimmed) {
        continue;
      }

      if (trimmed.toLowerCase() === "exit") {
        console.log("Goodbye!");
        break;
      }

      await runAgentForPrompt(trimmed);
      console.log("");
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
});
