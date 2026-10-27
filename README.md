# Hrtz

A pixel-style music visualizer. Upload a song or use your mic, and watch the sound turn into blocks of light.

**Live demo:** [hrtz.vercel.app](https://hrtz.vercel.app)

## Features

- Upload an audio file or use your microphone
- Three visual modes: **bars**, **circle** and **wave**
- Bitmap look: a tiny low-resolution canvas scaled up, drawn with square LED-style blocks
- Light and dark mode (remembers your choice)
- Works on desktop and phone

## How it works

The audio goes into the Web Audio API's `AnalyserNode`. It uses an FFT to tell us how loud each frequency is, many times per second. A `requestAnimationFrame` loop reads these numbers and draws them as blocks on a 160×90 canvas. CSS scales the canvas up with `image-rendering: pixelated`, which gives the bitmap effect.

## Tech stack

- React + Vite
- Web Audio API
- Canvas 2D
- Deployed on Vercel

## Run it locally

You need Node.js 18 or newer.

```bash
git clone https://github.com/rasyashakri05/Hrtz.git
cd Hrtz
npm install
npm run dev
```

Then open the link shown in the terminal (usually `http://localhost:5173`).

## Notes

- Microphone access needs `localhost` or HTTPS, and the browser will ask for permission.
- Browsers block audio until you click something, so start with the upload or mic button.

## Author

Made by rsy ([@rasyashakri05](https://github.com/rasyashakri05))
