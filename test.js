import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

(async () => {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
    });
    console.log(res.choices[0].message.content);
  } catch (err) {
    console.error("❌ OpenAI test failed:", err);
  }
})();