# 🌸 Finger Bloom

An interactive, premium browser-based **Augmented Reality (AR)** creative coding art experience. Using webcams and real-time machine learning via **MediaPipe Hands**, Finger Bloom tracks your hands to grow, animate, and trail beautiful glowing flowers directly from your fingertips.

---

## ✨ Features

- **Real-Time Hand Tracking**: Detects up to two hands and tracks all 21 key points using MediaPipe Hands.
- **Dynamic Flower Rendering**: 
  - *Vector Mode*: Renders custom procedural flowers with 6 bezier-curve petals, golden centers, shimmering gradients, and radial details.
  - *Emoji Mode*: Renders high-quality emojis (🌸, 🌹, 🌺, 🌻, 🌼, 🌷) perfectly centered and rotated.
  - *Hybrid Mode*: Alternates styles dynamically.
- **High-Performance Particle Engine**: Emission rates scale dynamically based on the velocity of your fingertips. Uses object pooling to prevent memory leaks and garbage collection frame stutter.
- **Tapered Ribbon Trails**: Generates smooth, glowing trails that fade and taper as fingers move.
- **Dual-Pass Canvas Bloom**: An offscreen composting technique that applies a lush, glowing bloom overlay to flowers and particles while leaving the camera feed 100% sharp.
- **Controls Dashboard**: A premium, frosted-glass (glassmorphic) control panel to configure particles, gravity (float up/fall down), wind, colors, tracking mesh debug displays, and FPS metrics.
- **Snapshot Capture**: Save your AR flower arrangements by downloading instant PNG snapshots directly from the UI.
- **100% Client-Side**: No servers or databases required. Runs fully inside the browser.

---

## 📁 Project Structure

```text
FingerBloom/
│
├── index.html       # Entrypoint & DOM layout structure (MediaPipe CDNs)
├── style.css        # Glassmorphic controls, layouts, and animations
├── script.js        # Core module coordinating tracking, physics, and canvas
│
├── README.md        # Documentation & technical breakdown
├── package.json     # Node script configuration & local dependencies
└── .gitignore       # Ignore files (node_modules, logs)
```

---

## 🚀 Getting Started

You can run Finger Bloom using either of the following two methods:

### Method 1: Using Node and NPM (Recommended)

1. Clone or download this project workspace to your local machine.
2. Open your terminal in the project directory.
3. Install the dependencies (this installs the MediaPipe local packages and a lightweight web server):
   ```bash
   npm install
   ```
4. Start the application:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:8080`.

### Method 2: Live Server (Zero Installation)

1. Open `index.html` directly using the VS Code **Live Server** extension (or any equivalent static server).
2. The page loads all dependencies dynamically from high-speed jsDelivr CDNs automatically.

---

## 🛠️ Technical Details & Mathematics

### 1. Horizontally Mirrored Aspect-Ratio Cover Crop
Because webcams mirror horizontal orientations relative to user movements, we must mirror our coordinates. Simply multiplying `landmark.x` by the width of the canvas is insufficient if the canvas aspect ratio differs from the camera. 

To ensure the camera frame covers the entire viewport without being stretched or squashed, we crop the input stream. This requires mapping raw tracking points (normalized `0.0` to `1.0` in original camera aspect ratio) into the cropped canvas viewport:

$$\text{Aspect Ratio Cover Math:}$$

Let the raw video width and height be $W_v$ and $H_v$, and canvas dimensions be $W_c$ and $H_c$. We calculate the cropped source bounds $(s_x, s_y, \text{drawWidth}, \text{drawHeight})$:

- If $\frac{W_c}{H_c} > \frac{W_v}{H_v}$:
  $$\text{drawWidth} = W_v, \quad \text{drawHeight} = \frac{W_v}{\text{canvasAspect}}$$
  $$s_x = 0, \quad s_y = \frac{H_v - \text{drawHeight}}{2}$$
- If $\frac{W_c}{H_c} \le \frac{W_v}{H_v}$:
  $$\text{drawWidth} = H_v \times \text{canvasAspect}, \quad \text{drawHeight} = H_v$$
  $$s_x = \frac{W_v - \text{drawWidth}}{2}, \quad s_y = 0$$

Using these parameters, we map a tracking point $(L_x, L_y)$ to cropped coordinates:

$$r_x = \frac{L_x \times W_v - s_x}{\text{drawWidth}}$$
$$r_y = \frac{L_y \times H_v - s_y}{\text{drawHeight}}$$

To mirror the camera feed horizontally for a natural selfie-style interaction:

$$X_{\text{canvas}} = (1 - r_x) \times W_c$$
$$Y_{\text{canvas}} = r_y \times H_c$$

This ensures that the blooms align exactly with your fingertips, regardless of desktop, mobile, or tablet orientation.

### 2. Dual-Pass Canvas Bloom
We isolate rendering elements (trails, particles, and flowers) onto an offscreen canvas. 
1. We draw the mirrored webcam image directly onto the main screen.
2. We render our graphic assets onto the offscreen canvas.
3. We copy the offscreen canvas normally onto the main canvas.
4. If bloom is enabled, we overlay the offscreen canvas a second time using a `'screen'` composite operation, a soft blur filter (`blur(10px)`), and a low opacity (`0.45`). This provides a glowing dreamlike haze around objects without reducing the clarity of the background camera feed.

---

## 💻 Browser Support

- Google Chrome (Desktop & Mobile)
- Apple Safari (macOS & iOS)
- Mozilla Firefox
- Microsoft Edge

*Note: Access to a webcam and permission authorization is required for operation.*

---

## 🔮 Future Improvements

1. **Gestures**: Bloomed flowers can detach and float away when you pinch your fingers, or blossom into a giant garden when you open your palm.
2. **Audio Reactive Bloom**: Have petals pulsate to microphone audio input or background music tracks.
3. **Face Mesh integration**: Grow flower crowns around your head using MediaPipe Face Mesh.
