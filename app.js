// ═══════════════════════════════════════════════════
//  FALSCH ZUGEORDNET — App-Logik
//  app.js
// ═══════════════════════════════════════════════════

const { useState, useEffect, useCallback } = React;


// ───────────────────────────────────────────────────
//  KONFIGURATION
// ───────────────────────────────────────────────────

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPOVUPZHd8sueDoyY0b7H4LsE9MjDNAdtOd-OOA79j8ELZRmnx9uBgtpSZ1DEr6ouj/exec";

// ───────────────────────────────────────────────────
//  LOKALER SPEICHER
//  Merkt sich nur: „Hat dieser Browser schon abgestimmt?"
// ───────────────────────────────────────────────────

const LS = {
  get(key) {
    try {
      const value = localStorage.getItem(key);
      return value != null ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};


// ───────────────────────────────────────────────────
//  API-FUNKTIONEN (kommunizieren mit Google Sheets)
// ───────────────────────────────────────────────────

// Alle Zitate + Bewertungen laden
async function apiLoad() {
  const res  = await fetch(APPS_SCRIPT_URL, { method: "GET" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Unbekannter Fehler");
  return data; // { quotes: [...], ratings: {...} }
}

// Neues Zitat oder Bewertung speichern
async function apiPost(body) {
  const res  = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    body:   JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Unbekannter Fehler");
  return data;
}


// ───────────────────────────────────────────────────
//  HILFSFUNKTION: Tipp des Nutzers prüfen
// ───────────────────────────────────────────────────

function checkGuess(guess, realAuthor) {
  if (!guess.trim()) return null;

  const input = guess.toLowerCase().trim();

  // Tipp gilt als richtig, wenn ein Namensteil des echten Autors
  // im eingegebenen Text vorkommt (mind. 3 Zeichen)
  const nameParts = realAuthor
    .toLowerCase()
    .split(/[\s,\-()/]+/)
    .filter(part => part.length > 2);

  return nameParts.some(part => input.includes(part));
}


// ───────────────────────────────────────────────────
//  KOMPONENTE: Stempel-Button
// ───────────────────────────────────────────────────

function Stamp({ type, label, myRating, stampAnim, onRate }) {
  const isChosen   = myRating === type;
  const isUnchosen = myRating && myRating !== type;
  const isImpact   = stampAnim === type;

  const classNames = [
    "stamp",
    type,
    isImpact   ? "impact"   : "",
    isChosen   ? "chosen"   : "",
    isUnchosen ? "unchosen" : "",
  ].filter(Boolean).join(" ");

  return (
    <button
      className={classNames}
      onClick={() => onRate(type)}
      disabled={!!myRating}
    >
      <div className="stamp-body">
        <span className="stamp-text">{label}</span>
      </div>
    </button>
  );
}


// ───────────────────────────────────────────────────
//  HAUPTKOMPONENTE
// ───────────────────────────────────────────────────

function App() {

  // Lade-Status der App
  const [status, setStatus] = useState("loading"); // "loading" | "ok" | "error"
  const [errMsg, setErrMsg] = useState("");

  // Daten aus Google Sheets
  const [quotes,  setQuotes]  = useState([]);
  const [ratings, setRatings] = useState({});

  // Welche Zitate hat dieser Browser schon bewertet?
  const [voted, setVoted] = useState({});

  // Aktuell angezeigtes Zitat
  const [curId,   setCurId]   = useState(null);
  const [cardKey, setCardKey] = useState(0); // Wechsel löst Karten-Animation aus

  // Stempel-Zustand
  const [myRating,  setMyRating]  = useState(null);
  const [stampAnim, setStampAnim] = useState(null);

  // Ratespiel
  const [guess,    setGuess]    = useState("");
  const [guessRes, setGuessRes] = useState(null); // null | true | false
  const [revealed, setRevealed] = useState(false);

  // Modal „Eigenes Zitat"
  const [modal,      setModal]      = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [form, setForm] = useState({
    text: "", wrongAuthor: "", realAuthor: "", source: "",
  });


  // ── Beim Start: Zitate + Bewertungen laden ──
  useEffect(() => {
    setVoted(LS.get("kk_voted") || {});

    apiLoad()
      .then(data => {
        const allQuotes = data.quotes || [];
        setQuotes(allQuotes);
        setRatings(data.ratings || {});

        // Zufälliges Startzitat wählen
        if (allQuotes.length > 0) {
          const random = allQuotes[Math.floor(Math.random() * allQuotes.length)];
          setCurId(random.id);
        }
        setStatus("ok");
      })
      .catch(err => {
        setErrMsg(err.message);
        setStatus("error");
      });
  }, []);


  // Aktuelles Zitat-Objekt
  const current = quotes.find(q => q.id === curId);


  // ── Nächstes Zitat (zufällig, nie dasselbe) ──
  const nextQuote = useCallback(() => {
    const pool = quotes.filter(q => q.id !== curId);
    const next = pool.length
      ? pool[Math.floor(Math.random() * pool.length)]
      : quotes[0];

    setCurId(next?.id);
    setMyRating(null);
    setStampAnim(null);
    setRevealed(false);
    setGuess("");
    setGuessRes(null);
    setCardKey(k => k + 1); // Karten-Animation neu auslösen
  }, [quotes, curId]);


  // ── Stempel drücken ──
  function handleRate(type) {
    if (myRating || !current || voted[current.id]) return;

    setMyRating(type);
    setStampAnim(type);
    setTimeout(() => setStampAnim(null), 560);

    const delta = {
      funny:    type === "funny"    ? 1 : 0,
      notFunny: type === "notfunny" ? 1 : 0,
    };

    // Lokal sofort anzeigen
    const prev = ratings[current.id] || { funny: 0, notFunny: 0, guessCorrect: 0, guessWrong: 0 };
    setRatings(r => ({
      ...r,
      [current.id]: {
        ...prev,
        funny:    prev.funny    + delta.funny,
        notFunny: prev.notFunny + delta.notFunny,
      },
    }));

    // Doppelwertung verhindern (bleibt im Browser gespeichert)
    const updVoted = { ...voted, [current.id]: true };
    setVoted(updVoted);
    LS.set("kk_voted", updVoted);

    // An Google Sheets senden
    apiPost({ type: "rating", id: current.id, ...delta });
  }


  // ── Aufdecken ──
  function handleReveal() {
    if (!current) return;

    const result = checkGuess(guess, current.realAuthor);
    setGuessRes(result);
    setRevealed(true);

    // Rateergebnis speichern (auch wenn nicht bewertet)
    if (guess.trim()) {
      const delta = {
        guessCorrect: result ? 1 : 0,
        guessWrong:   result ? 0 : 1,
      };
      const prev = ratings[current.id] || { funny: 0, notFunny: 0, guessCorrect: 0, guessWrong: 0 };
      setRatings(r => ({
        ...r,
        [current.id]: {
          ...prev,
          guessCorrect: prev.guessCorrect + delta.guessCorrect,
          guessWrong:   prev.guessWrong   + delta.guessWrong,
        },
      }));
      apiPost({ type: "rating", id: current.id, ...delta });
    }
  }


  // ── Eigenes Zitat einreichen ──
  async function handleAdd() {
    const { text, wrongAuthor, realAuthor, source } = form;
    if (!text.trim() || !wrongAuthor.trim() || !realAuthor.trim()) return;

    const newQuote = {
      id:          `u_${Date.now()}`,
      text:        text.trim(),
      wrongAuthor: wrongAuthor.trim(),
      realAuthor:  realAuthor.trim(),
      source:      source.trim() || "Eigene Sammlung",
    };

    setSaveStatus("loading");

    try {
      await apiPost({ type: "quote", ...newQuote });
      setQuotes(prev => [...prev, newQuote]);
      setSaveStatus("ok");
      setForm({ text: "", wrongAuthor: "", realAuthor: "", source: "" });
      setTimeout(() => { setModal(false); setSaveStatus(null); }, 1600);
    } catch (e) {
      setSaveStatus("err:" + (e.message || "Unbekannter Fehler"));
    }
  }


  // ── Statistiken berechnen ──
  const r     = ratings[current?.id] || { funny: 0, notFunny: 0, guessCorrect: 0, guessWrong: 0 };
  const total = r.funny + r.notFunny;
  const pct   = total > 0 ? Math.round((r.funny / total) * 100) : null;
  const totalGuesses = (r.guessCorrect || 0) + (r.guessWrong || 0);

  // Status-Text im Modal
  const [statusType, statusMsg] = saveStatus
    ? saveStatus.startsWith("err:")
      ? ["err",     saveStatus.slice(4)]
      : [saveStatus, saveStatus === "ok" ? "✓ Gespeichert!" : "Speichert…"]
    : [null, null];


  // ══════════════════════════════════════════════
  //  RENDER: Lade-Screen
  // ══════════════════════════════════════════════

  if (status === "loading") return (
    <div className="app">
      <div className="loading-screen">
        <div className="spinner" />
        <p className="loading-text">Lade Archiv…</p>
      </div>
    </div>
  );


  // ══════════════════════════════════════════════
  //  RENDER: Fehler-Screen
  // ══════════════════════════════════════════════

  if (status === "error") return (
    <div className="app">
      <div className="error-screen">
        <p className="error-title">Archiv nicht erreichbar</p>
        <p className="error-msg">
          Verbindung zum Google-Backend fehlgeschlagen.
          {errMsg && <><br />Fehler: {errMsg}</>}
        </p>
        <p className="error-hint">
          Prüfe, ob APPS_SCRIPT_URL in app.js korrekt eingetragen ist
          und die Web App auf „Jeder" gesetzt wurde.
        </p>
      </div>
    </div>
  );


  // ══════════════════════════════════════════════
  //  RENDER: Haupt-Ansicht
  // ══════════════════════════════════════════════

  return (
    <div className="app">

      {/* ── Zitat-Karte ── */}
      <div className="card" key={cardKey}>

        <p className="quote-text">„{current?.text}"</p>
        <p className="author-eyebrow">— laut unbestätigten Quellen</p>
        <p className="author-name">{current?.wrongAuthor}</p>
        <hr className="divider" />

        {/* Stempel */}
        <div className="stamps">
          <Stamp
            type="funny"
            label="Witzig"
            myRating={myRating}
            stampAnim={stampAnim}
            onRate={handleRate}
          />
          <Stamp
            type="notfunny"
            label="Nicht Witzig"
            myRating={myRating}
            stampAnim={stampAnim}
            onRate={handleRate}
          />
        </div>

        {/* Statistik — nur nach Abstimmung sichtbar */}
        {myRating && total > 0 && (
          <p className="stats-line">
            {pct}% fanden das witzig · {total} {total === 1 ? "Stimme" : "Stimmen"}
            {totalGuesses > 0 && ` · ${r.guessCorrect || 0} von ${totalGuesses} rieten richtig`}
          </p>
        )}

        {/* Ratespiel */}
        <div className="guess-area">
          <p className="guess-prompt">Wer hat das wirklich gesagt?</p>

          {!revealed && (
            <div className="guess-row">
              <input
                className="guess-input"
                value={guess}
                onChange={e => setGuess(e.target.value)}
                placeholder="Dein Tipp…"
                onKeyDown={e => e.key === "Enter" && handleReveal()}
              />
              <button className="reveal-btn" onClick={handleReveal}>
                Aufdecken
              </button>
            </div>
          )}

          {revealed && (
            <div className="reveal-result">
              <p className="reveal-label">Die Wahrheit</p>
              <p className="reveal-name">{current?.realAuthor}</p>
              <p className="reveal-source">{current?.source}</p>
              {guessRes === true  && <p className="guess-verdict verdict-correct">✓ Richtig geraten!</p>}
              {guessRes === false && <p className="guess-verdict verdict-wrong">✗ Knapp daneben.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Buttons unter der Karte ── */}
      <button className="btn-next" onClick={nextQuote}>
        Nächstes Zitat →
      </button>
      <button className="btn-add" onClick={() => { setSaveStatus(null); setModal(true); }}>
        + Eigenes Zitat
      </button>

      <p className="quote-count">{quotes.length} Zitate im Archiv</p>
      <p className="attribution">
        Falsch zugeordnete Zitate auf Grundlage von und in Anlehnung an das Känguru.<br />
        <a href="anmerkungen.html">Anmerkungen des Seiten-Erstellers</a>
      </p>

      {/* ── Modal: Eigenes Zitat einreichen ── */}
      {modal && (
        <div className="overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>

            <p className="modal-title">Eigenes Zitat</p>

            <p className="field-label">Das Zitat *</p>
            <textarea
              className="modal-input"
              placeholder="Was wurde gesagt…"
              value={form.text}
              onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
            />

            <p className="field-label">Falscher Autor (wird angezeigt) *</p>
            <input
              className="modal-input"
              placeholder="z. B. Friedrich Nietzsche"
              value={form.wrongAuthor}
              onChange={e => setForm(f => ({ ...f, wrongAuthor: e.target.value }))}
            />

            <p className="field-label">Richtiger Autor (zum Aufdecken) *</p>
            <input
              className="modal-input"
              placeholder="z. B. Das Känguru"
              value={form.realAuthor}
              onChange={e => setForm(f => ({ ...f, realAuthor: e.target.value }))}
            />

            <p className="field-label">Quelle (optional)</p>
            <input
              className="modal-input"
              placeholder="z. B. Die Känguru-Chroniken"
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            />

            {saveStatus && (
              <p className={`save-status ${statusType}`}>{statusMsg}</p>
            )}

            <div className="modal-actions">
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={!form.text || !form.wrongAuthor || !form.realAuthor || saveStatus === "loading"}
              >
                Im Archiv speichern
              </button>
              <button className="btn-secondary" onClick={() => setModal(false)}>
                Abbrechen
              </button>
            </div>

            <p className="modal-note">
              Das Zitat wird für <strong>alle Besucher</strong> sichtbar gespeichert.
            </p>

          </div>
        </div>
      )}

    </div>
  );
}

// App in den DOM einhängen
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
