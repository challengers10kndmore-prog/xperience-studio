import { XperienceLogo } from "@/components/brand/XperienceLogo";

export function Maintenance({ message }: { message: string | null }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-void px-6 text-center">
      <div className="max-w-md space-y-6">
        <XperienceLogo className="mx-auto w-48" />
        <p className="text-lg text-chrome">{message || "We're polishing a few frames. Back very soon."}</p>
      </div>
    </main>
  );
}
