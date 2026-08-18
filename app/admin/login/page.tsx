import { AdminLoginForm } from "@/components/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <div className="grid w-full overflow-hidden rounded-2xl border bg-card shadow-lg md:grid-cols-2">
          {/* Left: Video */}
          <section className="flex flex-col justify-center bg-primary p-8 text-primary-foreground md:p-10">
            <div className="aspect-video overflow hidden rounded-xl bg-black/20">
              <video
                className="h-full w-full object-cover"
                controls
                poster="/videos/poster.jpg"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="mt-6">
              <h2 className="text-2xl font-semibold">WELCOME TO CITIA-IS</h2>

              <p className="mt-2 text-sm text-primary-foreground/80">
                Learn how CITIA-IS supports invasive tree identification,
                community reporting, and environmental monitoring.
              </p>
            </div>
          </section>

          {/* Right: Login */}
          <section className="flex items-center p-8 md:p-12">
            <AdminLoginForm />
          </section>
        </div>
      </div>
    </main>
  );
}
