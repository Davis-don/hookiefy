// pages/Landing.tsx
import { useRedirectIfAuthenticated } from "../hooks/useRedirectIfAuthenticated";

function Landing() {
  useRedirectIfAuthenticated();   // 🔑 redirect if logged in

  return (
    <div>
      {/* your marketing / hero / nav / etc. */}
    </div>
  );
}

export default Landing;