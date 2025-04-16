import { TestShadcnButton } from '../components/TestShadcnButton';
import AuthForm from '../components/AuthForm';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-700 px-4">
      <div className="w-full max-w-md text-center mb-8">
        <h1 className="text-4xl font-extrabold text-white drop-shadow mb-2">HandwerkerPro</h1>
        <p className="text-lg text-neutral-200 mb-4">Welcome to the future of quoting for craftsmen and contractors in Germany.</p>
        <TestShadcnButton />
      </div>
      <AuthForm />
    </main>
  );
}
