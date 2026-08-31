import { Suspense } from "react";
import LoginForm from "./LoginForm";

// LoginForm reads the ?next= / ?error= query params via useSearchParams,
// which Next.js requires to be wrapped in Suspense.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
