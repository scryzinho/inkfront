import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Pipette, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESET_COLORS = [
  // Discord-inspired
  "#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245",
  // Blues
  "#3B82F6", "#0EA5E9", "#06B6D4", "#14B8A6", "#10B981",
  // Purples & Pinks
  "#8B5CF6", "#A855F7", "#D946EF", "#EC4899", "#F43F5E",
  // Oranges & Yellows
  "#F97316", "#EAB308", "#84CC16", "#22C55E", "#6366F1",
  // Neutrals
  "#FFFFFF", "#A1A1AA", "#71717A", "#52525B", "#27272A",
];

const RECENT_COLORS_KEY = "recent-colors";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
}

export function ColorPicker({ value, onChange, label, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_COLORS_KEY);
    if (stored) {
      try {
        setRecentColors(JSON.parse(stored));
      } catch {
        setRecentColors([]);
      }
    }
  }, []);

  const addToRecent = (color: string) => {
    const updated = [color, ...recentColors.filter((c) => c !== color)].slice(0, 10);
    setRecentColors(updated);
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(updated));
  };

  const handleColorSelect = (color: string) => {
    onChange(color);
    setInputValue(color);
    addToRecent(color);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue);
      addToRecent(newValue);
    }
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleColorSelect(e.target.value.toUpperCase());
  };

  const openNativePicker = () => {
    colorInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="text-sm font-medium mb-2 block text-muted-foreground">
          {label}
        </label>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <motion.button
            type="button"
            className={cn(
              "flex items-center gap-2 w-full h-12 px-3 rounded-xl",
              "bg-white/[0.03] backdrop-blur-sm",
              "border border-white/10 hover:border-white/20",
              "transition-all duration-200",
              "cursor-pointer",
              isOpen && "border-white/30 bg-white/[0.05]"
            )}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {/* Color Preview */}
            <div
              className="w-8 h-8 rounded-lg border border-white/20 shadow-inner overflow-hidden flex-shrink-0"
              style={{ backgroundColor: value }}
            >
              <div className="w-full h-full bg-gradient-to-br from-white/20 to-transparent" />
            </div>
            
            {/* HEX Value */}
            <span className="flex-1 text-sm font-mono uppercase text-left">
              {value || "#5865F2"}
            </span>
          </motion.button>
        </PopoverTrigger>
        
        <PopoverContent 
          className={cn(
            "w-72 p-0",
            "bg-background/95 backdrop-blur-xl",
            "border border-white/10",
            "shadow-xl shadow-black/20",
            "overflow-hidden"
          )}
          align="start"
          sideOffset={8}
        >
          {/* Header */}
          <div className="p-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Seletor de Cor</span>
              <div className="flex items-center gap-1">
                <motion.button
                  type="button"
                  onClick={openNativePicker}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Abrir seletor avançado"
                >
                  <Pipette className="w-4 h-4" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleColorSelect("#5865F2")}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Resetar cor"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>

          {/* Native Color Input (hidden) */}
          <input
            ref={colorInputRef}
            type="color"
            value={value}
            onChange={handleNativeColorChange}
            className="sr-only"
          />

          {/* Current Color Preview */}
          <div className="p-3 border-b border-white/5">
            <div
              className="w-full h-16 rounded-xl border border-white/10 relative overflow-hidden"
              style={{ backgroundColor: value }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
                <span className="text-xs font-mono text-white">{value}</span>
              </div>
            </div>
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div className="p-3 border-b border-white/5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Recentes
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {recentColors.map((color, index) => (
                  <motion.button
                    key={`${color}-${index}`}
                    type="button"
                    onClick={() => handleColorSelect(color)}
                    className={cn(
                      "w-7 h-7 rounded-lg border transition-all relative",
                      value === color
                        ? "border-white/40 ring-2 ring-white/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                    style={{ backgroundColor: color }}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {value === color && (
                      <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow-md" />
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Preset Colors */}
          <div className="p-3">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Cores Predefinidas
            </span>
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {PRESET_COLORS.map((color, index) => (
                <motion.button
                  key={`${color}-${index}`}
                  type="button"
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    "w-full aspect-square rounded-lg border transition-all relative",
                    value === color
                      ? "border-white/40 ring-2 ring-white/20"
                      : "border-white/10 hover:border-white/30"
                  )}
                  style={{ backgroundColor: color }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {value === color && (
                    <Check
                      className={cn(
                        "w-4 h-4 absolute inset-0 m-auto drop-shadow-md",
                        ["#FFFFFF", "#FEE75C", "#84CC16", "#22C55E", "#57F287"].includes(color)
                          ? "text-black/70"
                          : "text-white"
                      )}
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div className="p-3 pt-0">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg border border-white/20 flex-shrink-0"
                style={{ backgroundColor: value }}
              />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-lg font-mono uppercase",
                  "bg-white/5 border border-white/10",
                  "outline-none focus:border-white/20",
                  "transition-colors"
                )}
                placeholder="#5865F2"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
