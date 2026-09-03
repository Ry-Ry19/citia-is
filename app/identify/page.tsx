import { CameraScanner } from "@/components/identify/camera-scanner";

export default function IdentifyPage() {
    return (
        <main className="min-h-screen bg-background px-6 pb-16 pt-24">
            <CameraScanner />
        </main>
    )
}
