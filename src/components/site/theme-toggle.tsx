// Small three-state theme switcher (light / dark / system).
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, allowToggle, setMode } = useTheme();
  if (!allowToggle) return null;

  const options: { value: ThemeMode; icon: any; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className={cn("inline-flex items-center gap-0.5 border border-border rounded-full p-0.5", className)} role="group" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setMode(value)}
          aria-pressed={mode === value}
          aria-label={label}
          title={label}
          className={cn(
            "h-7 w-7 inline-flex items-center justify-center rounded-full transition-colors",
            mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}
