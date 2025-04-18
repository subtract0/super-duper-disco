"use client";
import React from "react";
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
    <form className="bg-white/10 backdrop-blur-md shadow-xl rounded-2xl px-8 py-8 flex flex-col gap-6 w-full max-w-md mx-auto border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-2">Login or Register</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white/80 text-black rounded-lg px-4 py-3 outline-none transition placeholder:text-neutral-400"
        required
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border border-neutral-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white/80 text-black rounded-lg px-4 py-3 outline-none transition placeholder:text-neutral-400"
        required
        autoComplete="current-password"
      />
      <div className="flex gap-4 mt-2">
        <button
          type="submit"
          onClick={handleSignIn}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition flex-1 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={handleSignUp}
          className="bg-white/80 hover:bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold transition flex-1 shadow-md border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading}
        >
          Register
        </button>
      </div>
      {error && <div className="text-red-400 text-center font-medium mt-2">{error}</div>}
      {success && <div className="text-green-400 text-center font-medium mt-2">{success}</div>}
    </form>
  );
}
