const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
});

// Test route
app.get("/", (req, res) => {
  res.send("Cocktail AI backend running with PostgreSQL");
});

// Register
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
      [username, email, hashed]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error registering user" });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const user = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (user.rows.length === 0)
      return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.rows[0].id, email: user.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, username: user.rows[0].username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get all drinks (for frontend dropdowns)
app.get("/drinks", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM drinks ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch drinks" });
  }
});

// Create or update user preferences
app.post("/preferences", async (req, res) => {
  const {
    user_id,
    alcohol_preference,
    sweetness_preference,
    bitterness_preference,
    sourness_preference,
    fruitiness_preference,
    earthiness_preference,
    allergies,
  } = req.body;

  if (!user_id) return res.status(400).json({ error: "user_id required" });

  try {
    const existing = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id=$1",
      [user_id]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE user_preferences 
         SET alcohol_preference=$1, sweetness_preference=$2, bitterness_preference=$3,
             sourness_preference=$4, fruitiness_preference=$5, earthiness_preference=$6,
             allergies=$7
         WHERE user_id=$8 RETURNING *`,
        [
          alcohol_preference,
          sweetness_preference,
          bitterness_preference,
          sourness_preference,
          fruitiness_preference,
          earthiness_preference,
          allergies,
          user_id,
        ]
      );
      res.json(result.rows[0]);
    } else {
      // Insert new
      const result = await pool.query(
        `INSERT INTO user_preferences 
        (user_id, alcohol_preference, sweetness_preference, bitterness_preference,
         sourness_preference, fruitiness_preference, earthiness_preference, allergies)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          user_id,
          alcohol_preference,
          sweetness_preference,
          bitterness_preference,
          sourness_preference,
          fruitiness_preference,
          earthiness_preference,
          allergies,
        ]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

// Get user preferences
app.get("/preferences/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      "SELECT * FROM user_preferences WHERE user_id=$1",
      [user_id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Preferences not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

app.post("/chat/user", async (req, res) => {
  const { user_id, message } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: "user_id and message required" });

  try {
    // 1️⃣ Fetch user preferences
    const prefResult = await pool.query("SELECT * FROM user_preferences WHERE user_id=$1", [user_id]);
    if (prefResult.rows.length === 0)
      return res.status(404).json({ error: "User preferences not found" });
    const prefs = prefResult.rows[0];

    // 2️⃣ Fetch drinks (we’ll use only name + main traits to keep context short)
    const drinksResult = await pool.query(
      "SELECT name, alcohol_level, sweetness, bitterness, sourness, fruitiness, earthiness FROM drinks"
    );
    const drinks = drinksResult.rows;

    // 3️⃣ Build compact context for Ollama
    const prompt = `
You are a professional bartender assistant. Respond briefly (max 3 sentences) and directly. 
Base your suggestion on the user's flavor preferences and the official IBA drink list.

USER PREFERENCES:
- Alcohol preference: ${prefs.alcohol_preference}/10
- Sweetness preference: ${prefs.sweetness_preference}/10
- Bitterness preference: ${prefs.bitterness_preference}/10
- Sourness preference: ${prefs.sourness_preference}/10
- Fruitiness preference: ${prefs.fruitiness_preference}/10
- Earthiness preference: ${prefs.earthiness_preference}/10
- Allergies: ${prefs.allergies || "none"}

IBA DRINKS (sample with attributes):
${drinks
  .slice(0, 15)
  .map(
    (d) =>
      `${d.name}: alcohol ${d.alcohol_level}, sweetness ${d.sweetness}, bitterness ${d.bitterness}, fruitiness ${d.fruitiness}`
  )
  .join("\n")}

USER MESSAGE: "${message}"

TASK:
Suggest the best fitting drink from the IBA list (if relevant), or describe what type of drink or ingredients to look for. 
Responses must be fast, friendly, and short, as if chatting with a bartender.
`;

    // 4️⃣ Send prompt to Ollama
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1", // or whichever model you're using
        prompt: prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    const reply = data.response?.trim() || "Sorry, I couldn't come up with a suggestion.";

    // 5️⃣ Send the response back to frontend
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Chat generation failed" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
