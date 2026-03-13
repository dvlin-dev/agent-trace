import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface SetupFormProps {
  onSubmit: (targetUrl: string) => Promise<void>;
}

export function SetupForm({ onSubmit }: SetupFormProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(targetUrl.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <Label htmlFor="target-url">TARGET_URL</Label>
        <Input
          id="target-url"
          type="url"
          placeholder="https://api.anthropic.com"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          autoFocus
        />
        <p className="text-sm text-muted-foreground">
          Claude Code API requests will be forwarded to this address
        </p>
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!targetUrl.trim() || isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save and Continue"}
      </Button>
    </form>
  );
}
