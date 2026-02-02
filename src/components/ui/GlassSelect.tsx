import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const GlassSelect = SelectPrimitive.Root;

const GlassSelectGroup = SelectPrimitive.Group;

const GlassSelectValue = SelectPrimitive.Value;

const GlassSelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    icon?: React.ReactNode;
  }
>(({ className, children, icon, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between gap-2 rounded-xl",
      "bg-white/[0.03] backdrop-blur-sm",
      "border border-white/10 hover:border-white/20",
      "px-4 py-3 text-sm",
      "ring-offset-background",
      "transition-all duration-200 ease-out",
      "placeholder:text-muted-foreground",
      "focus:outline-none focus:border-white/30 focus:bg-white/[0.05]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "[&>span]:line-clamp-1",
      "cursor-pointer",
      "group",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2 flex-1 min-w-0">
      {icon && (
        <span className="text-muted-foreground group-hover:text-foreground/80 transition-colors">
          {icon}
        </span>
      )}
      {children}
    </div>
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground/80 transition-all duration-200 group-data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
GlassSelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const GlassSelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[100] min-w-[8rem] overflow-hidden",
        "rounded-xl",
        "bg-background/95 backdrop-blur-xl",
        "border border-white/10",
        "shadow-xl shadow-black/20",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        "data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          "p-1.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
GlassSelectContent.displayName = SelectPrimitive.Content.displayName;

const GlassSelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider",
      className
    )}
    {...props}
  />
));
GlassSelectLabel.displayName = SelectPrimitive.Label.displayName;

const GlassSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & {
    icon?: React.ReactNode;
  }
>(({ className, children, icon, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center gap-2",
      "rounded-lg py-2.5 pl-3 pr-9 text-sm",
      "outline-none",
      "transition-all duration-150 ease-out",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      "focus:bg-white/10 focus:text-foreground",
      "hover:bg-white/[0.07]",
      "data-[state=checked]:bg-white/10",
      className
    )}
    {...props}
  >
    {icon && <span className="text-lg">{icon}</span>}
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
GlassSelectItem.displayName = SelectPrimitive.Item.displayName;

const GlassSelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1.5 h-px bg-white/10", className)}
    {...props}
  />
));
GlassSelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  GlassSelect,
  GlassSelectGroup,
  GlassSelectValue,
  GlassSelectTrigger,
  GlassSelectContent,
  GlassSelectLabel,
  GlassSelectItem,
  GlassSelectSeparator,
};
