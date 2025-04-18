import { TestShadcnButton } from '../components/TestShadcnButton';
import AuthForm from '../components/AuthForm';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700 px-4">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white drop-shadow mb-2">HandwerkerPro</h1>
        <p className="text-lg text-neutral-200 mb-4">Welcome to the future of quoting for craftsmen and contractors in Germany.</p>
        <TestShadcnButton />
        <a
          href="/agents"
          className="inline-block mt-6 px-6 py-3 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition"
          style={{ textDecoration: 'none' }}
        >
          Go to Agent Swarm Dashboard
        </a>
      </div>
      <AuthForm />
    </main>
  );
}
