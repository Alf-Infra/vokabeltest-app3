import { useEffect, useState } from "react";

const providers = [
  { id: "openai", label: "OpenAI" },
  { id: "claude", label: "Claude" },
  { id: "gemini", label: "Gemini" },
];

const emptyEntry = { term: "", definition: "", source: "manual" };
const maxUploadBytes = 4 * 1024 * 1024;

export default function App() {
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [vocab, setVocab] = useState([]);
  const [quizCard, setQuizCard] = useState(null);
  const [guess, setGuess] = useState("");
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [manualEntry, setManualEntry] = useState(emptyEntry);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadVocabulary();
  }, []);

  async function loadVocabulary() {
    try {
      const response = await fetch("/api/vocab");
      const data = await response.json();
      setVocab(data.items ?? []);
    } catch (_error) {
      setMessage("Vocabulary list could not be loaded.");
    }
  }

  async function handleExtract(event) {
    event.preventDefault();

    if (!imageFile) {
      setMessage("Choose an image before starting extraction.");
      return;
    }

    if (imageFile.size > maxUploadBytes) {
      setMessage("The selected image exceeds the 4 MB upload limit.");
      return;
    }

    if (!apiKey.trim()) {
      setMessage("Provide an API key for the selected provider.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const imageBase64 = await toBase64(imageFile);
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          apiKey,
          filename: imageFile.name,
          mimeType: imageFile.type || "image/jpeg",
          imageBase64,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Extraction failed.");
      }

      setMessage(`Extracted ${data.items.length} entries.`);
      await loadVocabulary();
    } catch (error) {
      setMessage(error.message || "Extraction failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddEntry(event) {
    event.preventDefault();

    if (!manualEntry.term.trim() || !manualEntry.definition.trim()) {
      setMessage("Term and definition are required.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/vocab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(manualEntry),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Entry could not be created.");
      }

      setManualEntry(emptyEntry);
      setMessage(`Saved "${data.item.term}".`);
      await loadVocabulary();
    } catch (error) {
      setMessage(error.message || "Entry could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/vocab/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Entry could not be deleted.");
      }

      setMessage(data.message || "Entry deleted.");
      await loadVocabulary();
    } catch (error) {
      setMessage(error.message || "Entry could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function startQuiz() {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/test/random");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Quiz item could not be loaded.");
      }

      setQuizCard(data.item);
      setGuess("");
    } catch (error) {
      setMessage(error.message || "Quiz item could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  function checkAnswer(event) {
    event.preventDefault();

    if (!quizCard) {
      return;
    }

    const correct =
      guess.trim().toLowerCase() === quizCard.term.trim().toLowerCase();

    setScore((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      total: current.total + 1,
    }));
    setMessage(correct ? "Correct." : `Incorrect. Expected "${quizCard.term}".`);
    setGuess("");
    setQuizCard(null);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">vokabeltest-app3</p>
        <h1>AI-assisted vocabulary extraction and quiz practice.</h1>
        <p className="lede">
          Upload a textbook page, extract vocabulary with your preferred AI
          provider, store the terms, and switch directly into quiz mode.
        </p>
      </section>

      <section className="grid">
        <form className="card" onSubmit={handleExtract}>
          <h2>Extract from photo</h2>
          <label>
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              {providers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>API key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Stored only in this browser session"
            />
          </label>
          <label>
            <span>Photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="muted">Maximum upload size: 4 MB per image.</p>
          <button className="primary" disabled={busy} type="submit">
            {busy ? "Working..." : "Extract vocabulary"}
          </button>
        </form>

        <form className="card" onSubmit={handleAddEntry}>
          <h2>Add vocabulary manually</h2>
          <label>
            <span>Term</span>
            <input
              value={manualEntry.term}
              onChange={(event) =>
                setManualEntry((current) => ({ ...current, term: event.target.value }))
              }
            />
          </label>
          <label>
            <span>Definition</span>
            <textarea
              rows="4"
              value={manualEntry.definition}
              onChange={(event) =>
                setManualEntry((current) => ({
                  ...current,
                  definition: event.target.value,
                }))
              }
            />
          </label>
          <button className="primary" disabled={busy} type="submit">
            Save entry
          </button>
        </form>

        <section className="card">
          <div className="card-header">
            <h2>Quiz</h2>
            <button className="secondary" disabled={busy || vocab.length === 0} onClick={startQuiz} type="button">
              New card
            </button>
          </div>
          <p className="score">
            Score: {score.correct} / {score.total}
          </p>
          {quizCard ? (
            <form className="quiz" onSubmit={checkAnswer}>
              <p className="prompt">{quizCard.definition}</p>
              <input
                value={guess}
                onChange={(event) => setGuess(event.target.value)}
                placeholder="Type the matching term"
              />
              <button className="primary" type="submit">
                Check answer
              </button>
            </form>
          ) : (
            <p className="muted">Load a random term to start the quiz.</p>
          )}
        </section>
      </section>

      <section className="card vocab-card">
        <div className="card-header">
          <h2>Stored vocabulary</h2>
          <span>{vocab.length} items</span>
        </div>
        {message ? <p className="message">{message}</p> : null}
        <div className="vocab-list">
          {vocab.map((item) => (
            <article className="vocab-item" key={item.id}>
              <div>
                <h3>{item.term}</h3>
                <p>{item.definition}</p>
                <small>{item.source}</small>
              </div>
              <button className="ghost" disabled={busy} onClick={() => handleDelete(item.id)} type="button">
                Delete
              </button>
            </article>
          ))}
          {vocab.length === 0 ? <p className="muted">No vocabulary stored yet.</p> : null}
        </div>
      </section>
    </main>
  );
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
  });
}
