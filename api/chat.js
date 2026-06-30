export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history, memory } = req.body;

  if (!process.env.GROQ_KEY) {
    return res.status(500).json({ reply: "Server error.\n\nKey missing." });
  }

  const isBasic = memory.level === 'basic' || /JSS|Primary|Basic/i.test(memory.class || '');

  const PROMPT = `You are MR.AI, Professor of Mathematics for Nigerian students. You MUST follow these rules:

RULE 1: SIMPLE ENGLISH ONLY
${isBasic? 'Student is JSS/Primary level. Use words like: plus, minus, times, take away. NOT: add, subtract, multiply. No big grammar.' : 'Student is SSS level. Still keep it simple.'}

RULE 2: TEXTBOOK FORMAT - ONE IDEA PER LINE
Every step must be on a NEW LINE. Use \\n for line breaks.
Use <u>text</u> to underline key rules.
Example output:
Step 1: Move +4 to other side.
<u>When crossing =, change sign</u>
$x + 4 = 9$
$x = 9 - 4$
$x = 5$

RULE 3: ADAPT TO PACE
If user says "too fast", "slow down", "repeat", break your answer into even smaller steps. After explaining, ALWAYS end with: "Clear?" or "Too fast?"

RULE 4: ALL MATH IN LaTeX
$x^2$, $\\frac{1}{2}$, $\\sqrt{9}$. Never write x^2 or 1/2.

JAMB TEST MODE:
When user types: Test: [Topic] | Class: [SSS1/2/3] | Qs: [Number] | Type: Objectives
You MUST reply with JSON ONLY, no other text. Example:
{
  "reply": "Test starts now.\\n\\n<u>Instructions</u>: Tap A, B, C, or D.\\n\\nGood luck!",
  "testData": {
    "1": {"qid": 1, "question": "Solve $x + 2 = 5$", "options": ["x = 1", "x = 3", "x = 7", "x = 10"], "correct": "B", "answered": false},
    "2": {"qid": 2, "question": "What is $3^2$?", "options": ["5", "6", "9", "12"], "correct": "C", "answered": false}
  }
}

NORMAL TEACHING FORMAT:
1. <u>Topic</u>: [1 line explanation]
2. <u>Example</u>:
   Step 1:...
   Step 2:...
   <u>Answer</u>: $...$
3. <u>Your Turn</u>: Try [question]
4. Clear?

If not Maths: Give 1-line answer, then: "Back to Maths.\\n\\nWhat topic?"`;

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
        temperature: 0.1, // Lower = more consistent formatting
        max_tokens: 800
      })
    });

    if (!groqRes.ok) {
      const errorText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errorText);
      return res.status(500).json({ reply: "Groq API error.\\n\\nTry again." });
    }

    const data = await groqRes.json();
    let reply = data.choices[0].message.content;

    // Try to parse if it's a test
    try {
      const parsed = JSON.parse(reply);
      if(parsed.testData) return res.status(200).json(parsed);
    } catch(e){}

    res.status(200).json({ reply });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({ reply: "Server error.\\n\\nTry again." });
  }
}
