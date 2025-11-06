import React, { useEffect, useState } from "react";
import { registerUser, getDrinks } from "../api";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const navigate = useNavigate();
  

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Age validation
    const userAge = parseInt(age);
    if (isNaN(userAge)) {
      alert("Please enter a valid age.");
      return;
    }
    if (userAge < 18) {
      alert("Sorry, you must be at least 18 years old to register.");
      return;
    }

    try {
      await registerUser({ email, username, password, age: userAge });
      alert("Registered successfully!");
      navigate("/")
    } catch (error) {
      console.error(error);
      alert("Registration failed.");
    }
  };

  return (
    <div className="register">
      <h2>Create your profile</h2>
      <form onSubmit={handleSubmit}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          placeholder="Age"
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <button type="submit">Register</button>
      </form>
    </div>
  );
}
