# Assignment 02 - AI Agent CLI Tool

This project is a conversational CLI AI agent that runs in terminal and performs step-by-step reasoning in a loop:

`START -> THINK -> TOOL -> OBSERVE -> ... -> OUTPUT`

It can create real website files (`HTML`, `CSS`, `JS`) from natural language instructions, including a Scaler Academy style clone page with:
- Header
- Hero section
- Footer

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
LOW_CREDIT_MODE=true
```

3. Start the CLI:

```bash
npm start
```

## Example Prompt

Use this inside the CLI:

`Create a folder named scaler_clone and generate a Scaler Academy style webpage with header, hero section, and footer using separate index.html, styles.css, and script.js files.`

Then open the generated `index.html` in browser.

## Low Credit Mode

- `LOW_CREDIT_MODE=true` (default recommended) uses **one model call** for webpage generation, then writes files locally.
- This dramatically reduces API usage for assignment demos while still showing START/THINK/TOOL/OBSERVE/OUTPUT logs.
- Set `LOW_CREDIT_MODE=false` to use full iterative agent loop.

## High-Quality Prompt (Use This In CLI)

Paste this full prompt in the CLI for much better output quality:

`Create a folder named scaler_clone. Build a Scaler Academy inspired landing page using separate files: index.html, styles.css, and script.js. The page must be fully working in browser and look modern and polished. Requirements: (1) Header with brand logo text, top navigation links, login button, and blue placement-report button. (2) Hero section with a large bold multi-line headline, highlighted blue keywords, short supporting paragraph, and program tags/chips below. (3) Footer with 4-5 columns of links plus a brand/about block. (4) Sticky bottom help bar with phone number and request-call CTA. Use semantic HTML5 tags, clean class names, responsive CSS (desktop + mobile), and a color palette close to Scaler (deep navy, bright blue, white, light gray). Add hover states for nav/buttons/chips. Keep code well formatted, not minified, and do not stop until all files are written successfully.`

## Project Structure

- `index.js` - main interactive AI CLI agent
- `package.json` - dependencies and scripts
- `.env` - environment variables (not committed)

## Notes for Submission

- Push this project to a **public GitHub repository**
- Record a **2-3 minute YouTube demo**:
  - CLI prompt entered
  - agent loop running with tool calls
  - generated files created
  - final webpage opened in browser
