require("dotenv").config(); // Load .env

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // node-fetch@2
const bodyParser = require("body-parser");
const multer = require("multer");
const nodemailer = require("nodemailer");
const busboy = require("connect-busboy"); // ✅ Add this line

const app = express();
const PORT = process.env.PORT || 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ✅ Gmail transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "rmpatel9124@gmail.com",
    pass: "bwmrgafrxvkhbcgz", // Use App Password only
  },
});

// ✅ Enable parsing multipart/form-data for Render compatibility
app.use(busboy());
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.use(cors());

// 🚀 /api/chat route
app.post("/api/chat", upload.single("media"), async (req, res) => {
  const { message } = req.body;
  const location = JSON.parse(req.body.location || "{}");
  const media = req.file;

  const locText = location?.address
    ? `स्थान: ${location.address}`
    : location?.lat
    ? `स्थान: अक्षांश ${location.lat}, देशांतर ${location.lon}`
    : "स्थान उपलब्ध नहीं है";

  const prompt = `
आप एक नागरिक सहायक एआई एजेंट हैं जो हिंदी में उत्तर देता है। कृपया नीचे दी गई कचरे से जुड़ी शिकायत को समझें और मददगार, संक्षिप्त उत्तर दें।

शिकायत:
"${message}"

${locText}
`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const result = await geminiRes.json();
    console.log("📩 Gemini Raw Response:", JSON.stringify(result, null, 2));

    if (result.error) {
      console.error("❌ Gemini API Error:", result.error.message);
      return res.json({ reply: "Gemini API से त्रुटि: " + result.error.message });
    }

    const reply =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "उत्तर प्राप्त नहीं हो पाया।";

    res.json({ reply });

    const attachments = media
      ? [
          {
            filename: media.originalname,
            content: media.buffer,
            contentType: media.mimetype,
          },
        ]
      : [];

    const mailOptions = {
      from: "CleanCityAgent <rmpatel9124@gmail.com>",
      to: "riddhidiwani035@gmail.com",
      subject: "🧹 नई कचरा शिकायत दर्ज की गई",
      text: `शिकायत: ${message}\nस्थान: ${locText}\n\nAI उत्तर: ${reply}`,
      attachments,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("❌ Email send error:", err);
      } else {
        console.log("📬 Email sent:", info.response);
      }
    });
  } catch (error) {
    console.error("❌ Server Error:", error);
    res.json({ reply: "Gemini AI से उत्तर प्राप्त करने में त्रुटि हुई।" });
  }
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ CleanCityAgent backend running at http://localhost:${PORT}`);
});
