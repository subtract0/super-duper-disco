import styles from './page.module.css';
import { TestShadcnButton } from '../components/TestShadcnButton';
import AuthForm from '../components/AuthForm';

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>HandwerkerPro</h1>
      <p>Welcome to the future of quoting for craftsmen and contractors in Germany.</p>
      <TestShadcnButton />
      <AuthForm />
    </main>
  );
}
