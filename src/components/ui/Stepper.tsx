import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                    backgroundColor: isCompleted 
                      ? "hsl(var(--primary))" 
                      : isCurrent 
                        ? "hsl(var(--surface-3))" 
                        : "hsl(var(--surface-2))",
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border transition-colors duration-300",
                    isCompleted && "border-primary",
                    isCurrent && "border-white/30",
                    !isCompleted && !isCurrent && "border-white/10"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <span className={cn(
                      "text-sm font-medium",
                      isCurrent ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {step.id}
                    </span>
                  )}
                </motion.div>
                <div className="mt-3 text-center">
                  <p className={cn(
                    "text-sm font-medium transition-colors",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              
              {!isLast && (
                <div className="flex-1 h-px mx-4 mt-[-2rem]">
                  <motion.div
                    initial={false}
                    animate={{
                      scaleX: isCompleted ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-primary origin-left"
                    style={{ transformOrigin: "left" }}
                  />
                  <div className="h-px bg-white/10 -mt-px" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
