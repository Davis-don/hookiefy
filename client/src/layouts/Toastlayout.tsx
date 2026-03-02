import { useEffect } from "react";
import Toastcomponent from "../components/Toast/Toastcomponent";
import { useToastStore } from "../store/Toaststore";

function Toastlayout({ children }: { children: React.ReactNode }) {
  const { isMounted, setIsMounted } = useToastStore();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, [setIsMounted]);

  return (
    <div className="main-toast-layout">
      {children}
      {isMounted && <Toastcomponent />}
    </div>
  );
}

export default Toastlayout;