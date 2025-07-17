import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [mediaFile, setMediaFile] = useState(null); 

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setLocation(coords);

        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lon}`
        )
          .then((res) => res.json())
          .then((data) => {
            const address = [
              data.address.suburb,
              data.address.road,
              data.address.city || data.address.town,
              data.address.state,
              data.address.country,
            ]
              .filter(Boolean)
              .join(", ");
            setLocation((prev) => ({ ...prev, address }));
          });
      },
      (err) => {
        console.error("Location error:", err);
        setLocation({ lat: null, lon: null });
      }
    );
  }, []);

  // 🎙️ Hindi voice input
  const handleVoiceInput = () => {
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setListening(false);
    };
    recognition.onerror = () => {
      alert("🎤 माइक चालू नहीं है या अनुमति नहीं मिली।");
      setListening(false);
    };

    recognition.start();
  };

  // 🗣️ Text-to-speech Hindi response
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    window.speechSynthesis.speak(utterance);
  };

  // 🚀 Send complaint with media + location
  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", message);
      formData.append("location", JSON.stringify(location));
      if (mediaFile) formData.append("media", mediaFile);

      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResponse(data.reply);
      speak(data.reply);
    } catch (error) {
      setResponse("सर्वर से उत्तर प्राप्त नहीं हुआ।");
    }

    setLoading(false);
  };

  return (
  
    <div style={{ padding: "2rem", fontSize: "1rem", fontFamily: "sans-serif", width: "100%", height: "100%", margin: "auto",paddingTop:"70px"}}>
      <h2>🧹 CleanCityAgent</h2>

      <textarea
        rows="3"
        placeholder="अपनी शिकायत लिखें या बोलें..."
        style={{ width: "50%",height:"100px", padding: "1rem", fontSize: "1rem" }}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* 📸 Media file input */}
      <div style={{ marginTop: "1rem" }}>
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setMediaFile(e.target.files[0])}
        />
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={handleSend} disabled={loading} style={{ padding: "0.5rem 1rem" }}>
          {loading ? "भेजा जा रहा है..." : "शिकायत भेजें"}
        </button>{" "}
        <button onClick={handleVoiceInput} disabled={listening} style={{ padding: "0.5rem 1rem" }}>
          🎙️ {listening ? "सुन रहा है..." : "बोलें"}
        </button>
      </div>

      <div style={{ marginTop: "2rem", background: "#000", color: "#fff", padding: "1rem" ,width:"50%", height:"150px" }}>
        <strong>🧠 AI उत्तर:</strong>
        <p>{response}</p>
      </div>

      <div style={{ fontSize: "0.9rem", marginTop: "1rem" }}>
        <strong>📍 स्थान:</strong>{" "}
        {location?.address
          ? location.address
          : location?.lat
          ? `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`
          : "स्थान नहीं मिला"}
      </div>
    </div>
  );
}

export default App;
