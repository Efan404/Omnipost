export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Omnipost
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Write once, publish everywhere with intelligent content adaptation
        </p>
        <div className="flex gap-4 justify-center pt-8">
          <a
            href="/login"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Get Started
          </a>
          <a
            href="/dashboard"
            className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
