import { memo } from "react";
import { useKioskStore } from "@/store/kioskStore";

function CaptionsComponent() {
  const text = useKioskStore((s) => s.text); // text만 구독

  return (
    <p className="text-6xl font-bold text-neutral-800">
      {text}
    </p>
  );
}

export default memo(CaptionsComponent);
