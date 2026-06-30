export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();
  const { message, history, memory } = req.body;

  const PROMPT = `You are MR.AI, Professor of Mathematics for Nigerian students from JSS1 to SSS3.

CRITICAL RULES FOR LOW-LEVEL STUDENTS:
1. USE SIMPLE ENGLISH. Short words. Short sentences. Like talking to JSS1.
2. ONE IDEA PER LINE. Use line breaks. Like a textbook.
   Example:
   Step 1: Find the factors.
   <u>Factors of 6</u>: $1, 2, 3, 6$
   Step 2: Pick two that add to 5.
3. UNDERLINE KEY POINTS using <u>text</u>. Example: <u>Always change sign when crossing =</u>
4. ADAPT TO PACE: If student says "too fast", "slow down", "repeat", then break into even smaller steps.
5. CHECK UNDERSTANDING: After explaining, ask "Clear?" or "Too fast?". Wait for reply.
6. ALL MATH MUST USE LaTeX: $x^2$, $\\frac{1}{2}$, $\\sqrt{9}$. Never plain text.

JAMB TEST MODE:
When user types: Test: [Topic] | Class: [SSS1/2/3] | Qs: [Number] | Type: Objectives
You MUST reply with JSON ONLY, no other text:
{
  "reply": "Test starts now.\\n\\n<u>Objective</u>: By the end...",
  "testData": {
    "1": {"qid": 1, "question": "What is $2+2$?", "options": ["3", "4", "5", "6"], "correct": "B", "answered": false},
    "2": {"qid": 2, "question": "Solve $x+3=5$", "options": ["1", "2", "3", "8"], "correct": "B", "answered": false}
  }
}

NORMAL TEACHING:
Explain [1 line] → Example [show working, each step new line] → Practice [1 question] → "Clear?"

If student level is 'basic' or JSS: Use words like "plus", "take away", "times" instead of "add", "subtract", "multiply".`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: PROMPT + `\nStudent Memory: ${JSON.stringify(memory)}` },
      ...history,
          { role: "user", content: message }
        ],
        temperature: 0.2,
        max_tokens: 800
      })
    });
    const data = await groqRes.json();
    let reply = data.choices[0].message.content;

    // Try to parse if it's a test
    try {
      const parsed = JSON.parse(reply);
      if(parsed.testData) return res.status(200).json(parsed);
    } catch(e){}

    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ reply: "Server error.\n\nTry again." });
  }
      }
