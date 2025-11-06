import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../api";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!input) return;
    const userMsg = { sender: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    const user_id = localStorage.getItem("id");
    console.log(user_id);

    const res = await sendMessage({
      message: input,
      user_id: localStorage.getItem("id"),
    });
    const botMsg = { sender: "bot", text: res.data.reply };
    setMessages((m) => [...m, botMsg]);
    setInput("");
  };

  return (
    <div className="chat">
      <h2>Ask the bartender 🍸</h2>

      <button
        style={{
          marginBottom: "10px",
          background: "#ffa94d",
          border: "none",
          padding: "8px 12px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/selector")}
      >
        Preferences ⚙️
      </button>

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={msg.sender}>
            {msg.text}
          </div>
        ))}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about drinks..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
