export default function PageWrapper({ children }) {
  return (
    <main className="min-h-screen px-4 py-6">
      {children}
    </main>
  );
}
