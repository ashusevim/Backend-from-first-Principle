import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const fieldClass =
  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(fieldClass, "h-9", invalid && "border-destructive focus-visible:ring-destructive", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(fieldClass, "min-h-[80px] resize-y", invalid && "border-destructive", className)}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-medium leading-none", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted-foreground">Optional</span>}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
