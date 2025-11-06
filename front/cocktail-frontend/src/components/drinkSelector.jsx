import React, { useState, useEffect } from "react";
import { getDrinks, setPreference } from "../api";
import { useNavigate } from "react-router-dom";

export default function Selector() {
  const [drinks, setDrinks] = useState([]);
  const [selected, setSelected] = useState([]);
  const [allergies, setAllergies] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Load drinks from backend
  const handleLoadDrinks = async () => {
    try {
      setLoading(true);
      const res = await getDrinks();
      setDrinks(res.data);
    } catch (err) {
      console.error("Error loading drinks:", err);
      alert("Failed to load drinks. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    handleLoadDrinks();
  }, []);

  // Group drinks by IBA category
  const grouped = drinks.reduce((acc, d) => {
    acc[d.iba_category] = acc[d.iba_category] || [];
    acc[d.iba_category].push(d);
    return acc;
  }, {});

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const chosen = drinks.filter((d) => selected.includes(d.id));
    if (chosen.length === 0) return alert("Select at least one drink!");

    const fields = [
      "alcohol_level",
      "sweetness",
      "bitterness",
      "sourness",
      "fruitiness",
      "earthiness",
    ];

    const averages = {};
  fields.forEach((f) => {
    const avg = chosen.reduce((sum, d) => sum + d[f], 0) / chosen.length;
    // ✅ Rename keys properly
    if (f === "alcohol_level") {
      averages["alcohol_preference"] = Math.round(avg);
    } else {
      averages[`${f}_preference`] = Math.round(avg);
    }
  });
    console.log(averages);
    

    const user_id = localStorage.getItem("id");

    try {
      const res = await setPreference({
        user_id,
        ...averages,
        allergies,
      });
      alert("Preferences saved!");
      console.log("Saved:", res.data);
      navigate("/chat")
    } catch (err) {
      console.error("Error saving preferences:", err);
      alert("Error saving preferences");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Select your favorite drinks 🍹</h2>

      {loading ? (
        <p>Loading drinks...</p>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} style={{ marginBottom: "20px" }}>
            <h3>{category}</h3>
            {items.map((d) => (
              <label key={d.id} style={{ display: "block" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(d.id)}
                  onChange={() => toggleSelect(d.id)}
                />{" "}
                {d.name} ({d.category})
              </label>
            ))}
          </div>
        ))
      )}

      <div style={{ marginTop: "20px" }}>
        <h4>Allergies or restrictions:</h4>
        <input
          type="text"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="E.g. nuts, dairy, citrus..."
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      <button
        style={{
          marginTop: "20px",
          background: "#38b000",
          color: "white",
          border: "none",
          padding: "10px 16px",
          borderRadius: "8px",
          cursor: "pointer",
        }}
        onClick={handleSubmit}
      >
        Save Preferences ✅
      </button>
    </div>
  );
}
