import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";

export function AdminBypassBanner({ configKey, label }: { configKey: string; label: string }) {
  const { data: config } = useQuery<any>({ queryKey: [`/api/config/${configKey}`] });
  if (!config?.value || config.value !== "true") return null;
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2 flex items-center gap-2 text-sm mb-4">
      <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="text-amber-600 font-medium">Admin Bypass Active:</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

export function AdminBypassMulti({ bypasses }: { bypasses: { key: string; label: string }[] }) {
  return (
    <>
      {bypasses.map(b => (
        <AdminBypassBanner key={b.key} configKey={b.key} label={b.label} />
      ))}
    </>
  );
}
