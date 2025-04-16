"use client";
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setSuccess("Check your email for a confirmation link!");
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else setSuccess("Signed in! Redirecting...");
    setLoading(false);
  };

  return (
    <form className="flex flex-col gap-4 w-full max-w-xs mx-auto mt-10">
      <h2 className="text-xl font-bold">Login or Register</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border rounded p-2"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border rounded p-2"
        required
      />
      <div className="flex gap-2">
        <button
          type="submit"
          onClick={handleSignIn}
          className="bg-black text-white px-4 py-2 rounded hover:bg-neutral-800 transition flex-1"
          disabled={loading}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition flex-1"
          disabled={loading}
        >
          Register
        </button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">{success}</div>}
    </form>
  );
}
