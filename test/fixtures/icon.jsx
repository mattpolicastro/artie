import { Heart, Sparkles } from "lucide-react";

export default function IconDemo() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-rose-50 text-rose-600">
      <Sparkles size={64} strokeWidth={1.5} />
      <p className="flex items-center gap-2 text-xl font-medium">
        lucide resolved via esm.sh <Heart size={20} fill="currentColor" />
      </p>
    </div>
  );
}
