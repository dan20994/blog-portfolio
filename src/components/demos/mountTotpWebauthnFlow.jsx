import { createRoot } from "react-dom/client";
import TotpWebauthnFlow from "./TotpWebauthnFlow.jsx";

export function mount(el) {
  createRoot(el).render(<TotpWebauthnFlow />);
}
