import fs from "fs/promises";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcesPath = path.join(projectRoot, "research", "sources.example.json");
const outputPath = path.join(projectRoot, "research", "persona_research.json");

function cleanText(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function extractYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.searchParams.has("v")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchWebPageSummary(url) {
  const { data } = await axios.get(url, {
    timeout: 12000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });
  const $ = cheerio.load(data);
  const title = cleanText($("title").text());
  const paragraphs = $("p")
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 12);

  return {
    type: "web",
    url,
    title,
    excerpt: paragraphs.join(" ").slice(0, 3000)
  };
}

async function fetchYouTubeTranscript(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error(`Unsupported YouTube URL: ${url}`);
  }
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const text = transcript.map((x) => x.text).join(" ");
  return {
    type: "youtube",
    url,
    videoId,
    excerpt: cleanText(text).slice(0, 6000)
  };
}

async function run() {
  const raw = await fs.readFile(sourcesPath, "utf-8");
  const sources = JSON.parse(raw);
  const result = {};

  for (const persona of Object.keys(sources)) {
    const entries = [];
    for (const url of sources[persona]) {
      try {
        if (url.includes("youtube.com") || url.includes("youtu.be")) {
          entries.push(await fetchYouTubeTranscript(url));
        } else {
          entries.push(await fetchWebPageSummary(url));
        }
      } catch (error) {
        entries.push({
          type: "error",
          url,
          error: error.message
        });
      }
    }
    result[persona] = entries;
  }

  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
  console.log(`Research written to ${outputPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
