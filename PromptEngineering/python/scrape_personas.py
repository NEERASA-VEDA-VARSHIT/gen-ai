import json
import re
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi

ROOT = Path(__file__).resolve().parents[1]
SOURCES_FILE = ROOT / "research" / "sources.example.json"
OUTPUT_FILE = ROOT / "research" / "persona_research_py.json"


def clean_text(value: str) -> str:
  return re.sub(r"\s+", " ", value).strip()


def youtube_video_id(url: str) -> str | None:
  if "youtu.be/" in url:
    return url.split("youtu.be/")[-1].split("?")[0]
  if "v=" in url:
    return url.split("v=")[-1].split("&")[0]
  return None


def scrape_web(url: str) -> dict:
  response = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0"})
  response.raise_for_status()
  soup = BeautifulSoup(response.text, "html.parser")
  title = clean_text(soup.title.get_text()) if soup.title else ""
  paragraphs = [clean_text(p.get_text()) for p in soup.find_all("p")]
  excerpt = " ".join([p for p in paragraphs if p][:12])[:3000]
  return {"type": "web", "url": url, "title": title, "excerpt": excerpt}


def scrape_youtube(url: str) -> dict:
  video_id = youtube_video_id(url)
  if not video_id:
    raise ValueError(f"Could not parse video id from: {url}")
  transcript = YouTubeTranscriptApi.get_transcript(video_id)
  excerpt = clean_text(" ".join(line["text"] for line in transcript))[:6000]
  return {"type": "youtube", "url": url, "video_id": video_id, "excerpt": excerpt}


def main():
  sources = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
  out = {}
  for persona, urls in sources.items():
    rows = []
    for url in urls:
      try:
        if "youtube.com" in url or "youtu.be" in url:
          rows.append(scrape_youtube(url))
        else:
          rows.append(scrape_web(url))
      except Exception as exc:  # noqa: BLE001
        rows.append({"type": "error", "url": url, "error": str(exc)})
    out[persona] = rows

  OUTPUT_FILE.write_text(json.dumps(out, indent=2), encoding="utf-8")
  print(f"Wrote research output to {OUTPUT_FILE}")


if __name__ == "__main__":
  main()
