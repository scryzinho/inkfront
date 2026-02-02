import { motion } from "framer-motion";

const brands = [
  "Discord", "Twitch", "YouTube", "Steam", "Spotify", 
  "Epic Games", "Riot Games", "EA Sports", "Ubisoft", "PlayStation"
];

export function BrandMarquee() {
  return (
    <section className="py-20 relative overflow-hidden border-y border-white/[0.04]">
      <div className="container mb-10">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-sm text-muted-foreground"
        >
          Usado por comunidades das maiores plataformas
        </motion.p>
      </div>

      {/* Marquee container */}
      <div className="relative">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background to-transparent z-10" />

        {/* Scrolling content */}
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex shrink-0 gap-16"
          >
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={index}
                className="text-xl font-medium text-white/20 whitespace-nowrap hover:text-white/40 transition-colors duration-300 cursor-default"
              >
                {brand}
              </div>
            ))}
          </motion.div>
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex shrink-0 gap-16"
          >
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={index}
                className="text-xl font-medium text-white/20 whitespace-nowrap hover:text-white/40 transition-colors duration-300 cursor-default"
              >
                {brand}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
