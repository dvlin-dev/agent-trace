import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import { useAppStore } from "../stores/app-store";

export function ListeningToggle() {
  const { isListening, toggleListening } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isListening}
        onCheckedChange={() => toggleListening()}
        aria-label="Toggle proxy listening"
      />
      <Badge variant={isListening ? "default" : "secondary"}>
        {isListening ? "Listening" : "Off"}
      </Badge>
    </div>
  );
}
