import { useEffect } from "react";
import { getPending } from "./pending";
import { useSubmitMatch } from "./queries";

export function useRetryPending(): void {
  const submit = useSubmitMatch();

  useEffect(() => {
    const flush = () => {
      for (const record of getPending()) submit.mutate(record);
    };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);
}
