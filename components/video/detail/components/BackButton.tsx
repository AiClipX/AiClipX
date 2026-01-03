import { useRouter } from "next/router";

export function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    router.push("/dashboard/test-video-list"); // back to video list
  };

  return (
    <button
      className="mb-4 text-sm text-blue-400 hover:underline"
      onClick={handleBack}
    >
      ← Back to list
    </button>
  );
}
