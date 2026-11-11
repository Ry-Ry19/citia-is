import { CameraScanner } from "@/components/identify/camera-scanner";
import Link from "next/link";

export default function IdentifyPage() {
    return (
        <main className="min-h-screen bg-[#09090b] px-4 pb-16 pt-24 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
                <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#10b981]">
                    YOLOv8n-cls Identification Terminal
                </p>
                <Link
                    href="/"
                    className="mt-4 text-xs font-medium text-zinc-500 hover:text-[#10b981] dark:text-zinc-400 dark:hover:text-[#10b981] transition-colors mb-4 inline-block"
                >
                    ← Back to Home
                </Link>
                <h1 className="mt-2 text-center text-3xl font-bold text-white">
                    Identify a Tree
                </h1>
                <p className="text-sm text-zinc-300 font-medium mt-2 text-center">
                    Take a leaf photo to check for Swietenia macrophylla.
                </p>
                <div className="mt-6">
                    <CameraScanner />
                </div>
            </div>
        </main>
    )
}
