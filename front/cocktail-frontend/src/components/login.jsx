import React, { useState } from "react";
import { loginUser } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser({ email, password });
      console.log(res);
      
      if (res.data.success) {
        localStorage.setItem("user", JSON.stringify(res.data.username));
        localStorage.setItem("id", JSON.stringify(res.data.userid));
        navigate("/chat");
      } else {
        setError("Invalid credentials front");
      }
    } catch (err) {
      console.error(err);
      setError("Error logging in");
    }
  };

  return (
    <div className="login">
      <h2>Welcome back 🍸</h2>
      <form onSubmit={handleLogin}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Login</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <p>
        Don't have an account? <a href="/register">Register</a>
      </p>
    </div>
  );
}
