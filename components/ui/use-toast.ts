import { toast as sonnerToast } from "sonner";

type ToastProps = {
  description?: string;
};

export function useToast() {
  return {
    toast: ({ description }: ToastProps) => {
      sonnerToast(description || "");
    },
  };
}
