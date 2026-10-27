import { useRef, useState, useEffect } from "react";

const MODES = ["bars", "circle", "wave"];
const COLS = 32;
const ROWS = 18;
const CELL = 5;
const SIZE = 4;

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="6" y="6" width="4" height="4" />
      <rect x="7" y="1" width="2" height="2" />
      <rect x="7" y="13" width="2" height="2" />
      <rect x="1" y="7" width="2" height="2" />
      <rect x="13" y="7" width="2" height="2" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      <rect x="3" y="11" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 8 8" width="18" height="18" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="2" y="0" width="3" height="1" />
      <rect x="1" y="1" width="2" height="1" />
      <rect x="0" y="2" width="2" height="4" />
      <rect x="1" y="6" width="2" height="1" />
      <rect x="6" y="6" width="1" height="1" />
      <rect x="2" y="7" width="4" height="1" />
    </svg>
  );
}

export default function App() {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataRef = useRef(null);
  const micStreamRef = useRef(null);
  const micSourceRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState("bars");
  const [micOn, setMicOn] = useState(false);
  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
  );

  function setupAudio() {
    if (audioCtxRef.current) return;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    const source = audioCtx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    source.connect(audioCtx.destination);

    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);
  }

  function stopMic() {
    if (!micStreamRef.current) return;
    micStreamRef.current.getTracks().forEach((t) => t.stop());
    micSourceRef.current.disconnect();
    micStreamRef.current = null;
    setMicOn(false);
  }

  async function toggleMic() {
    if (micOn) {
      stopMic();
      setFileName("");
      return;
    }
    try {
      setupAudio();
      await audioCtxRef.current.resume();
      audioRef.current.pause();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = audioCtxRef.current.createMediaStreamSource(stream);
      micSource.connect(analyserRef.current);
      micStreamRef.current = stream;
      micSourceRef.current = micSource;
      setFileName("Microphone");
      setMicOn(true);
    } catch {
      alert("Mic permission was blocked.");
    }
  }

  async function handleFile(e) {
    stopMic();
    const file = e.target.files[0];
    if (!file) return;
    setupAudio();
    await audioCtxRef.current.resume();
    audioRef.current.src = URL.createObjectURL(file);
    audioRef.current.play();
    setFileName(file.name);
  }

  // Theme: set the attribute on <html> and remember the choice
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Drawing loop (restarts when mode or theme changes)
  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas.getContext("2d");
    let frameId;

    const css = getComputedStyle(document.documentElement);
    const FG = css.getPropertyValue("--fg").trim();
    const ACCENT = css.getPropertyValue("--accent").trim();
    const SCREEN = css.getPropertyValue("--screen").trim();
    const CELL_OFF = css.getPropertyValue("--cell-off").trim();

    function cell(col, row, color) {
      c.fillStyle = color;
      c.fillRect(col * CELL, row * CELL, SIZE, SIZE);
    }

    function draw() {
      frameId = requestAnimationFrame(draw);

      c.fillStyle = SCREEN;
      c.fillRect(0, 0, canvas.width, canvas.height);
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) cell(col, row, CELL_OFF);
      }

      const analyser = analyserRef.current;
      if (!analyser) return;

      const data = dataRef.current;
      if (mode === "wave") analyser.getByteTimeDomainData(data);
      else analyser.getByteFrequencyData(data);

      const step = Math.floor(600 / COLS);

      if (mode === "bars") {
        for (let i = 0; i < COLS; i++) {
          const v = data[i * step] / 255;
          const lit = Math.round(v * ROWS);
          for (let r = 0; r < lit; r++) {
            cell(i, ROWS - 1 - r, r === lit - 1 ? ACCENT : FG);
          }
        }
      } else if (mode === "circle") {
        const cx = COLS / 2;
        const cy = ROWS / 2;
        const spokes = 48;
        for (let i = 0; i < spokes; i++) {
          const v = data[(i % COLS) * step] / 255;
          const angle = (i / spokes) * Math.PI * 2;
          const len = Math.round(v * 5);
          for (let k = 0; k < len; k++) {
            const d = 3 + k;
            const col = Math.round(cx + Math.cos(angle) * d);
            const row = Math.round(cy + Math.sin(angle) * d);
            cell(col, row, k === len - 1 ? ACCENT : FG);
          }
        }
      } else {
        const W = canvas.width;
        const H = canvas.height;
        const mid = H / 2;
        const gain = 2;
        let prevY = null;
        c.fillStyle = FG;
        for (let x = 0; x < W; x++) {
          const sample = data[Math.floor((x / (W - 1)) * 1023)];
          let y = Math.round(mid + ((sample - 128) / 128) * mid * gain);
          y = Math.max(1, Math.min(H - 3, y));
          const from = prevY === null ? y : Math.min(prevY, y);
          const to = prevY === null ? y : Math.max(prevY, y);
          c.fillRect(x, from, 1, to - from + 2);
          prevY = y;
        }
      }
    }
    draw();

    return () => cancelAnimationFrame(frameId);
  }, [mode, theme]);

  return (
    <div className="app">
      <div className="top">
        <span>Audio / Visualizer</span>
        <div className="top-right">
          <span>
            0{MODES.indexOf(mode) + 1} / 0{MODES.length}
          </span>
          <button
            className="btn icon-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      <h1>
        See the <span>sound</span>
      </h1>
      <p className="sub">
        Upload a song or use your mic. Every frequency becomes a block of light.
      </p>

      <div className="controls">
        <label className="btn" htmlFor="file">Upload song</label>
        <input id="file" type="file" accept="audio/*" onChange={handleFile} />
        <button className={"btn" + (micOn ? " rec" : "")} onClick={toggleMic}>
          {micOn ? "Stop mic" : "Use mic"}
        </button>
        {MODES.map((m) => (
          <button
            key={m}
            className={"btn" + (mode === m ? " active" : "")}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} width={160} height={90} className="screen" />
      <p className="status">{fileName || "No song yet"}</p>
      <audio ref={audioRef} controls />

      <footer className="watermark">
        <span><i />Made by RSY</span>
        <span>2026</span>
      </footer>
    </div>
  );
}