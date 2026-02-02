import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, Smile, Heart, ThumbsUp, Zap, Gamepad2, Flag, Coffee, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const EMOJI_CATEGORIES = [
  {
    id: "recent",
    name: "Recentes",
    icon: <Clock className="w-4 h-4" />,
    emojis: [], // Will be populated from localStorage
  },
  {
    id: "popular",
    name: "Populares",
    icon: <Star className="w-4 h-4" />,
    emojis: ["🛒", "📦", "💎", "🎮", "🎁", "⭐", "🔥", "💰", "🚀", "✨", "🎯", "💫", "💳", "🏆", "💵", "🎪"],
  },
  {
    id: "smileys",
    name: "Rostos",
    icon: <Smile className="w-4 h-4" />,
    emojis: ["😊", "🤩", "😎", "🥳", "🤑", "😍", "🤗", "😇", "🥰", "😏", "🤤", "😋", "😜", "🤪", "😝", "🤓", "😈", "👻", "💀", "🤖", "👽", "🎃", "😺", "🙀"],
  },
  {
    id: "hearts",
    name: "Corações",
    icon: <Heart className="w-4 h-4" />,
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💗", "💖", "💝", "💘", "💕", "💞", "💓", "💔", "❣️", "💟", "♥️"],
  },
  {
    id: "gestures",
    name: "Gestos",
    icon: <ThumbsUp className="w-4 h-4" />,
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "👌", "🤌", "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪", "🦾"],
  },
  {
    id: "objects",
    name: "Objetos",
    icon: <Coffee className="w-4 h-4" />,
    emojis: ["📱", "💻", "🖥️", "🖨️", "⌨️", "🖱️", "💾", "💿", "📀", "🎧", "🎵", "🎶", "🎙️", "📺", "🎬", "📷", "📸", "📹", "🔍", "💡", "🔦", "🏮", "📚", "📖", "📰", "🗞️", "💰", "💵", "💴", "💶", "💷", "💳", "💎"],
  },
  {
    id: "symbols",
    name: "Símbolos",
    icon: <Zap className="w-4 h-4" />,
    emojis: ["✅", "❌", "❗", "❓", "⭕", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "⬛", "⬜", "◼️", "◻️", "🔶", "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "⚡", "💥", "💢", "💦", "💨", "🌟"],
  },
  {
    id: "games",
    name: "Jogos",
    icon: <Gamepad2 className="w-4 h-4" />,
    emojis: ["🎮", "🕹️", "🎲", "♠️", "♥️", "♦️", "♣️", "🃏", "🀄", "🎴", "🎯", "🎳", "🎰", "🧩", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🎗️", "🎟️", "🎫"],
  },
  {
    id: "flags",
    name: "Bandeiras",
    icon: <Flag className="w-4 h-4" />,
    emojis: ["🏳️", "🏴", "🏁", "🚩", "🎌", "🏳️‍🌈", "🏳️‍⚧️", "🇧🇷", "🇺🇸", "🇬🇧", "🇪🇸", "🇫🇷", "🇩🇪", "🇮🇹", "🇯🇵", "🇰🇷", "🇨🇳", "🇷🇺", "🇵🇹", "🇦🇷", "🇲🇽", "🇨🇦", "🇦🇺"],
  },
];

const RECENT_EMOJIS_KEY = "recent-emojis";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    if (stored) {
      setRecentEmojis(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const addToRecent = (emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter((e) => e !== emoji)].slice(0, 24);
    setRecentEmojis(updated);
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated));
  };

  const handleEmojiSelect = (emoji: string) => {
    onChange(emoji);
    addToRecent(emoji);
    setIsOpen(false);
    setSearchQuery("");
  };

  const categories = useMemo(() => {
    return EMOJI_CATEGORIES.map((cat) =>
      cat.id === "recent" ? { ...cat, emojis: recentEmojis } : cat
    );
  }, [recentEmojis]);

  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const allEmojis = EMOJI_CATEGORIES.flatMap((cat) => cat.emojis);
    const uniqueEmojis = [...new Set(allEmojis)];
    // Simple search - just return all emojis (in a real app, you'd search by name)
    return uniqueEmojis;
  }, [searchQuery]);

  const currentCategory = categories.find((c) => c.id === activeCategory);
  const displayEmojis = filteredEmojis || currentCategory?.emojis || [];

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <motion.button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-12 px-4 py-3 rounded-xl",
          "bg-white/[0.03] backdrop-blur-sm",
          "border border-white/10 hover:border-white/20",
          "flex items-center justify-center gap-2",
          "transition-all duration-200",
          "text-2xl",
          "cursor-pointer group",
          isOpen && "border-white/30 bg-white/[0.05]"
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span>{value || "📦"}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute z-[100] top-full left-0 mt-2 w-80",
              "rounded-xl",
              "bg-background/95 backdrop-blur-xl",
              "border border-white/10",
              "shadow-xl shadow-black/20",
              "overflow-hidden"
            )}
          >
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar emoji..."
                  className={cn(
                    "w-full pl-9 pr-3 py-2 text-sm rounded-lg",
                    "bg-white/5 border border-white/10",
                    "outline-none focus:border-white/20",
                    "transition-colors placeholder:text-muted-foreground"
                  )}
                />
              </div>
            </div>

            {/* Category Tabs */}
            {!searchQuery && (
              <div className="flex gap-0.5 px-2 py-1.5 border-b border-white/5 bg-white/[0.02] overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                  <motion.button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    disabled={cat.id === "recent" && cat.emojis.length === 0}
                    className={cn(
                      "flex-shrink-0 p-2 rounded-lg transition-all duration-150",
                      activeCategory === cat.id
                        ? "bg-white/10 text-foreground"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground/80",
                      cat.id === "recent" && cat.emojis.length === 0 && "opacity-40 cursor-not-allowed"
                    )}
                    whileHover={{ scale: cat.id === "recent" && cat.emojis.length === 0 ? 1 : 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={cat.name}
                  >
                    {cat.icon}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Category Title */}
            {!searchQuery && currentCategory && (
              <div className="px-3 py-2 border-b border-white/5 bg-white/[0.01]">
                <span className="text-xs font-medium text-muted-foreground">
                  {currentCategory.name}
                </span>
              </div>
            )}

            {searchQuery && (
              <div className="px-3 py-2 border-b border-white/5 bg-white/[0.01]">
                <span className="text-xs font-medium text-muted-foreground">
                  Resultados da busca
                </span>
              </div>
            )}

            {/* Emoji Grid */}
            <div className="p-2 max-h-64 overflow-y-auto">
              {displayEmojis.length > 0 ? (
                <motion.div
                  key={activeCategory + searchQuery}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.1 }}
                  className="grid grid-cols-8 gap-1"
                >
                  {displayEmojis.map((emoji, index) => (
                    <motion.button
                      key={`${emoji}-${index}`}
                      type="button"
                      onClick={() => handleEmojiSelect(emoji)}
                      className={cn(
                        "w-9 h-9 flex items-center justify-center text-xl rounded-lg",
                        "transition-all duration-150",
                        "hover:bg-white/10",
                        value === emoji && "bg-white/10 ring-1 ring-white/20"
                      )}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  {activeCategory === "recent"
                    ? "Nenhum emoji recente"
                    : "Nenhum emoji encontrado"}
                </div>
              )}
            </div>

            {/* Custom Input */}
            <div className="p-3 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl">
                  {value || "📦"}
                </div>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="Ou digite..."
                  className={cn(
                    "flex-1 px-3 py-2 text-sm rounded-lg",
                    "bg-white/5 border border-white/10",
                    "outline-none focus:border-white/20",
                    "transition-colors text-center text-lg"
                  )}
                  maxLength={4}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
