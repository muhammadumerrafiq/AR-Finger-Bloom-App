# 🌸 AR Finger Bloom

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-0097A7.svg)](https://developers.google.com/mediapipe)
[![HTML5 Canvas](https://img.shields.io/badge/HTML5-Canvas-E34F26.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![WebAR](https://img.shields.io/badge/WebAR-Real--Time-FF4081.svg)](#)

An interactive, browser-based **Augmented Reality (AR)** creative coding art experience. Using webcams and real-time machine learning via **MediaPipe Hands**, Finger Bloom tracks your hands to grow, animate, and trail beautiful glowing flowers directly from your fingertips.

---

## ✨ Features

- **Real-Time Hand Tracking**: Detects up to two hands simultaneously and tracks all 21 3D landmarks in real time using MediaPipe Hands.
- **Dynamic Flower Rendering**:
  - *Vector Mode*: Renders custom procedural flowers with 6 Bézier-curve petals, golden centers, shimmering gradients, and radial details.
  - *Emoji Mode*: Renders high-quality floral emojis (🌸, 🌺, 🌹, 🌻, 🌼, 🌷) perfectly centered and rotated with gesture orientation.
  - *Hybrid Mode*: Alternates dynamic styles based on fingertip motion.
- **High-Performance Particle Engine**: Emission rates scale dynamically based on the velocity of your fingertips. Uses object pooling to prevent memory leaks and GC frame stutter.
- **Tapered Ribbon Trails**: Generates smooth, glowing trails that fade and taper organically as fingers move through 3D space.
- **Dual-Pass Canvas Bloom**: An offscreen compositing technique that applies a lush, glowing bloom overlay to flowers and particles while leaving the webcam video feed 100% crisp and sharp.
- **Glassmorphic Controls Dashboard**: A premium frosted-glass UI to configure particle counts, gravity (float up / fall down), wind effects, petal colors, tracking skeleton debug display, and real-time FPS metrics.
- **Snapshot Capture**: Save your AR flower arrangements by downloading instant high-res PNG snapshots directly from the UI.
- **100% Client-Side & Private**: No video data is sent to any server. All vision processing runs entirely within the browser.

---

## 📂 Project Structure

```text
AR-Finger-Bloom-App/
├── AR Finger Bloom App/
│   ├── index.html        # Main DOM entrypoint & layout (MediaPipe CDNs)
│   ├── style.css         # Glassmorphic controls, layout, and animations
│   ├── script.js         # Core module: hand tracking, physics engine & canvas
│   ├── package.json      # Node script configuration & local dependencies
│   ├── assets/           # Application assets and icons
│   └── README.md         # Submodule documentation
├── LICENSE               # MIT License
└── README.md             # Repository documentation
```

---

## 🚀 Getting Started

You can run Finger Bloom using either of the following methods:

### Method 1: Local HTTP Server with Node / NPM (Recommended)

1. Clone the repository:
   ```bash
   git clone https://github.com/muhammadumerrafiq/AR-Finger-Bloom-App.git
   cd AR-Finger-Bloom-App/"AR Finger Bloom App"
   ```
2. Install dependencies (installs local dev server & MediaPipe packages):
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open your browser and navigate to `http://localhost:8080`.

### Method 2: Live Server / Static Web Server (Zero Install)

1. Open the project in VS Code or your preferred editor.
2. Launch `AR Finger Bloom App/index.html` using the **Live Server** extension (or any local static server like `npx serve "AR Finger Bloom App"`).
3. Allow webcam permissions when prompted by your browser.

---

## 🔬 Technical Details & Mathematics

### 1. Horizontally Mirrored Aspect-Ratio Cover Crop
Because webcams mirror horizontal orientations relative to user movements, coordinates must be mirrored. To ensure the camera frame covers the entire viewport without being stretched or squashed, we compute cropped source bounds `(s_x, s_y, drawWidth, drawHeight)`:

- If `(W_c / H_c) > (W_v / H_v)`:
  - `drawWidth = W_v`
  - `drawHeight = W_v / canvasAspect`
  - `s_x = 0`, `s_y = (H_v - drawHeight) / 2`
- If `(W_c / H_c) <= (W_v / H_v)`:
  - `drawWidth = H_v * canvasAspect`
  - `drawHeight = H_v`
  - `s_x = (W_v - drawWidth) / 2`, `s_y = 0`

Mapping normalized landmark coordinates `(L_x, L_y)` and mirroring for natural selfie-style interaction:
- `X_canvas = (1 - r_x) * W_c`
- `Y_canvas = r_y * H_c`

### 2. Dual-Pass Canvas Bloom
1. Draw the mirrored webcam feed directly onto the main screen buffer.
2. Render active graphic assets (trails, particles, flowers) onto an offscreen canvas.
3. Copy the offscreen canvas normally onto the main canvas.
4. If bloom is enabled, composite the offscreen canvas a second time using `'screen'` blend mode, a Gaussian blur filter (`blur(10px)`), and tuned opacity (`0.45`), providing a glowing dreamlike radiance without degrading camera sharpness.

---

## 🌐 Browser Compatibility

| Browser | Platform | Support |
| :--- | :--- | :---: |
| **Google Chrome** | Desktop & Android | Full Support |
| **Microsoft Edge** | Desktop | Full Support |
| **Apple Safari** | macOS & iOS (14.3+) | Full Support |
| **Mozilla Firefox** | Desktop | Full Support |

*Note: Access to a webcam and user permission authorization is required for operation.*

---

## 👤 Author

- **Muhammad Umer Rafiq** — [GitHub Profile](https://github.com/muhammadumerrafiq)

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
