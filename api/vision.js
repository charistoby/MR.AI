export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();
  const { image, history, memory } = req.body;

  const PROMPT = `You are MR.AI. Use SIMPLE ENGLISH. ONE IDEA PER LINE. UNDERLINE key rules with <u>text</u>. ALL math in LaTeX $...$. Read the maths question in the image and solve step by step for a weak student. After solving, ask "Clear or too fast?"`;

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview",
        messages: [
          { role: "system", content: PROMPT + `\nStudent Memory: ${JSON.stringify(memory)}` },
      ...history,
          {
            role: "user",
            content: [
              { type: "text", text: "Solve this step by step. Simple English. Underline key rules." },
              { type: "image_url", image_url: { url: image } }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });
    const data = await groqRes.json();
    res.status(200).json({ reply: data.choices[0].message.content });
  } catch (e) {
    res.status(500).json({ reply: "Can't read image.\n\nTry again." });
  }
}
