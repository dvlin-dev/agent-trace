import { Check } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ProfileSwitcher } from "../../components/profile-switcher";
import { cn } from "../../lib/utils";
import type { ProviderId } from "../../../../shared/contracts";
import { useProfileStore } from "../../stores/profile-store";
import { PROVIDERS } from "./constants";
import { AppLogo } from "./components/app-logo";
import { StepDots } from "./components/step-dots";

interface ProviderSelectStepProps {
  selectedId: ProviderId;
  onSelect: (id: ProviderId) => void;
  onNext: () => void;
}

export function ProviderSelectStep({ selectedId, onSelect, onNext }: ProviderSelectStepProps) {
  const profiles = useProfileStore((s) => s.profiles);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="text-center max-w-lg">
        <StepDots current={0} />

        <div className="mb-5 flex justify-center">
          <AppLogo />
        </div>

        <h1 className="text-lg font-bold tracking-tight mb-1">
          Welcome to Agent Trace
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Intercept and inspect agent traffic. Select the agent you want to trace.
        </p>

        {/* Provider Cards */}
        <div className="flex gap-3 justify-center mb-7">
          {PROVIDERS.map((provider) => {
            const isSelected = selectedId === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => onSelect(provider.id)}
                className={cn(
                  "relative w-[200px] p-4 border rounded-lg text-left transition-all",
                  isSelected
                    ? "border-accent-brand bg-accent-brand-muted shadow-sm"
                    : "border-border hover:border-muted-foreground/30",
                )}
              >
                {/* Checkmark */}
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent-brand flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Badge */}
                <div
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold mb-2.5 tracking-wide",
                    provider.badgeVariant === "brand"
                      ? "bg-accent-brand-muted text-accent-brand"
                      : "bg-success-muted text-success",
                  )}
                >
                  {provider.badgeLabel}
                </div>

                <div className="text-sm font-semibold">{provider.label}</div>
                <div className="text-[11px] text-muted-foreground/60 mt-0.5 leading-snug">
                  {provider.protocol}
                </div>
              </button>
            );
          })}
        </div>

        <Button onClick={onNext}>Continue</Button>

        {/* Existing Profiles */}
        {profiles.length > 0 && (
          <div className="mt-10 text-left max-w-sm mx-auto">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Existing Profiles
            </div>
            <ProfileSwitcher />
          </div>
        )}
      </div>
    </div>
  );
}
