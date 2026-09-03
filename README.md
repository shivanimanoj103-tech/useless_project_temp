<img width="1280" height="640" alt="git (1)" src="https://github.com/user-attachments/assets/8920b256-2ba8-4988-b824-5351134eb4bd" />

# Needy 🎯

## Basic Details
### Team Name: Beta

### Team Members
- Team Lead: Shivani Manoj - Muthoot Institution of Technology and Science

### Project Description
Needy is an emotionally demanding webcam-based application featuring a pair of animated googly eyes that track whether you're making direct eye contact with your screen. Using real-time MediaPipe face mesh tracking, Needy transitions through increasingly dramatic emotional states when you dare to look away, complete with passive-aggressive synthetic speech commentary and local storage leaderboard persistence.

### The Problem (that doesn't exist)
In a world full of distractions, your monitor is lonely and starved for unconditional eye contact. Nobody ever asks how your screen feels when you turn away to look at your phone, look out the window, or read code documentation.

### The Solution (that nobody asked for)
Needy solves screen loneliness by guilt-tripping you into staring at your monitor continuously! If you look away for even a few seconds, Needy evolves from mildly annoyed to offended, petty, and emotionally detached, complete with vocal commentary demanding your full attention and saving your eye contact streaks in local storage.

## Technical Details
### Technologies/Components Used
For Software:
- Languages: JavaScript (ES6+), HTML5, CSS3
- Frameworks: React 18, Vite
- Libraries: @mediapipe/tasks-vision (FaceMesh), Web Speech API (SpeechSynthesis)
- Storage: Browser LocalStorage (for offline persistent leaderboard rankings)
- Tools: VS Code, Git, GitHub

For Hardware:
- Main components: Standard USB / Built-in Webcam
- Specifications: Web camera supporting 720p video stream
- Tools required: Modern browser with WebRTC and camera access permissions

### Implementation
For Software:
# Installation
```bash
npm run install:all
```

# Run
```bash
npm run dev
```

### Project Documentation
For Software:

# Screenshots

![Screenshot1](docs/screenshot1.jpg)
*Default theme — The app's idle "I See You" state. Two large 3D cartoon googly eyes with yellow-gold rims rest at screen center. Below them is a glassmorphic state panel and a green "Eye contact ✓" status pill.*

![Screenshot2](docs/screenshot2.jpg)
*"Offended" state — After 16 seconds of the user looking away, eyelids drop heavily in a scowl, the iris turns red-orange, and the background shifts to a warm ominous gradient.*

![Screenshot3](docs/screenshot3.jpg)
*Debug Panel open — The slide-out Debug Panel shows live Gaze & Eye Closure Telemetry (EAR, face detection), State Machine Controls with sliders, and Force State buttons for every emotion.*

![Screenshot4](docs/screenshot4.jpg)
*"Uncomfortable" state with Tear — After 6 seconds of sustained staring, the eyelids rise anxiously, the iris shifts to cyan, and a small glossy teardrop forms at the lower inner tear duct.*

# Diagrams
![Workflow](docs/workflow.jpg)
*System architecture: MediaPipe FaceMesh → Gaze/EAR analysis → Emotional State Machine → Reactive Canvas Eyes + Web Speech TTS*

For Hardware:

# Schematic & Circuit
*N/A - Software-based webcam application*

# Build Photos
*N/A - Software-based webcam application*

### Project Demo
# Video
[▶️ Watch Demo on YouTube / Drive](#)
*Real-time face tracking, emotional state transitions across 11 states, shy mode, passive-aggressive voice commentary (English & Malayalam), Neon Void theme toggle, and leaderboard.*

# Additional Demos
[🚀 Live Web App — run `npm run dev` locally]

## Team Contributions
- Shivani Manoj: Core application development, MediaPipe gaze tracking, React UI design, emotional state machine, voice synthesis integration, and LocalStorage leaderboard management.

---
Made with ❤️ at TinkerHub Useless Projects 

![Static Badge](https://img.shields.io/badge/TinkerHub-24?color=%23000000&link=https%3A%2F%2Fwww.tinkerhub.org%2F)
![Static Badge](https://img.shields.io/badge/UselessProjects--26-26?link=https%3A%2F%2Ftinkerhub.org%2Fevents%2F1M8ORET9A1%2Fuseless-projects-3.0)
