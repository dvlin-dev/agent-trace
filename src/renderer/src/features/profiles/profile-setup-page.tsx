import { useState } from "react";
import { useProfileStore } from "../../stores/profile-store";
import type { ProviderId } from "../../../../shared/contracts";
import { PROVIDERS } from "./constants";
import { ProfileForm } from "./profile-form";
import { ProviderSelectStep } from "./provider-select-step";
import { ConfigureStep } from "./configure-step";

type Step = "select" | "configure" | "manual";

export function ProfileSetupPage() {
  const [step, setStep] = useState<Step>("select");
  const [selectedId, setSelectedId] = useState<ProviderId>("anthropic");
  const [upstreamUrl, setUpstreamUrl] = useState(PROVIDERS[0].defaultUrl);
  const [localPort, setLocalPort] = useState(PROVIDERS[0].defaultPort);
  const [isCreating, setIsCreating] = useState(false);

  const upsertProfile = useProfileStore((s) => s.upsertProfile);
  const startProfile = useProfileStore((s) => s.startProfile);

  const provider = PROVIDERS.find((p) => p.id === selectedId) ?? PROVIDERS[0];

  function handleSelectProvider(id: ProviderId) {
    setSelectedId(id);
    const p = PROVIDERS.find((pv) => pv.id === id) ?? PROVIDERS[0];
    setUpstreamUrl(p.defaultUrl);
    setLocalPort(p.defaultPort);
  }

  async function handleStart() {
    setIsCreating(true);
    try {
      const profile = {
        id: crypto.randomUUID(),
        name: `${provider.label} Dev`,
        providerId: provider.id,
        upstreamBaseUrl: upstreamUrl.trim() || provider.defaultUrl,
        localPort,
        enabled: true,
        autoStart: true,
      };
      await upsertProfile(profile);
      await startProfile(profile.id);
    } finally {
      setIsCreating(false);
    }
  }

  if (step === "manual") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="w-full max-w-md">
          <button
            className="text-xs text-muted-foreground hover:text-foreground mb-4"
            onClick={() => setStep("configure")}
          >
            ← Back
          </button>
          <ProfileForm
            onSubmit={async (profile) => {
              await upsertProfile(profile);
              await startProfile(profile.id);
            }}
          />
        </div>
      </div>
    );
  }

  if (step === "configure") {
    return (
      <ConfigureStep
        provider={provider}
        upstreamUrl={upstreamUrl}
        localPort={localPort}
        onUpstreamUrlChange={setUpstreamUrl}
        onLocalPortChange={setLocalPort}
        onBack={() => setStep("select")}
        onStart={handleStart}
        onManual={() => setStep("manual")}
        isCreating={isCreating}
      />
    );
  }

  return (
    <ProviderSelectStep
      selectedId={selectedId}
      onSelect={handleSelectProvider}
      onNext={() => setStep("configure")}
    />
  );
}
