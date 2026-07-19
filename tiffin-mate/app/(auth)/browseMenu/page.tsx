import Link from "next/link";

export default function BrowsePage() {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans flex items-center justify-center p-6">
      <div className="max-w-2xl w-full p-8 bg-white rounded-2xl shadow">
        <h1 className="text-2xl font-bold mb-2">Browse Menu (Dummy)</h1>
        <p className="text-neutral-600">This is a placeholder page for the Browse Menu. Replace with the real menu later.</p>
        <div className="mt-6">
          <Link href="/dashboard" className="text-orange-600 hover:underline">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
