"use client";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export default function SubmitButton({ children, disabled, pendingText = "Menyimpan..." }: { children: React.ReactNode; disabled?: boolean; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="default" disabled={pending || disabled}>
      {pending ? pendingText : children}
    </Button>
  );
}
