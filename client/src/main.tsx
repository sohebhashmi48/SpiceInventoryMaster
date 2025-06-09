import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupResponsiveModeDetection } from "./utils/responsive-fix";

// Setup responsive mode detection
setupResponsiveModeDetection();

createRoot(document.getElementById("root")!).render(<App />);
