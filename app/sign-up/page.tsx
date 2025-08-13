'use client';
import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { Mail, Lock, User, AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

const SignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

    // 🔧 Initialize Supabase client in useEffect to prevent prerender issues
    useEffect(() => {
        const client = createClientComponentClient();
        setSupabase(client);
    }, []);

    // Domain validation function
    const isValidDomain = (email: string) => {
        return email.toLowerCase().endsWith('@digitalblitz.media');
    };

    const validatePassword = () => {
        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return false;
        }
        return true;
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if Supabase client is ready
        if (!supabase) {
            setError('Application is loading...');
            return;
        }

        setError('');

        // Validate email domain before proceeding
        if (!isValidDomain(email)) {
            setError('Registration restricted to @digitalblitz.media email addresses only.');
            return;
        }

        if (!validatePassword()) {
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                // Customize error messages for better UX
                if (error.message.includes('User already registered')) {
                    setError('An account with this email already exists. Please try signing in instead.');
                } else {
                    setError(error.message);
                }
            } else if (data.user) {
                setSuccess(true);
            }
        } catch (error) {
            setError('An unexpected error occurred');
            console.error('Sign up error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Real-time email validation
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEmail = e.target.value;
        setEmail(newEmail);

        // Clear error when user starts typing
        if (error && error.includes('Registration restricted')) {
            setError('');
        }
    };

    // Check if email is valid for styling
    const emailHasError = email && !isValidDomain(email);

    // Show loading state while Supabase client is initializing
    if (!supabase) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                    <span className="text-lg text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Registration successful!</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>Please check your <strong>@digitalblitz.media</strong> email to verify your account.</p>
                                </div>
                                <div className="mt-4">
                                    <Link
                                        href="/login"
                                        className="text-sm font-medium text-green-800 hover:text-green-700"
                                    >
                                        Go to login →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <Shield className="h-12 w-12 text-blue-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            sign in to existing account
                        </Link>
                    </p>

                    {/* Domain restriction notice */}
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center">
                            <Shield className="h-4 w-4 text-blue-500 mr-2" />
                            <p className="text-xs text-blue-700">
                                Registration restricted to <span className="font-mono font-semibold">@digitalblitz.media</span> email addresses
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSignUp} className="mt-8 space-y-6">
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertCircle className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                                Full Name
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="John Doe"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className={`h-5 w-5 ${emailHasError ? 'text-red-400' : 'text-gray-400'}`} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={handleEmailChange}
                                    className={`appearance-none relative block w-full px-3 py-2 pl-10 border ${emailHasError
                                        ? 'border-red-300 text-red-900 placeholder-red-300'
                                        : 'border-gray-300 text-gray-900 placeholder-gray-500'
                                        } rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                                    placeholder="john@digitalblitz.media"
                                />
                                {emailHasError && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                        <AlertCircle className="h-4 w-4 text-red-400" />
                                    </div>
                                )}
                            </div>
                            {emailHasError && (
                                <p className="mt-1 text-xs text-red-600">
                                    Please use your @digitalblitz.media email address
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                            <p className="mt-1 text-sm text-gray-500">Must be at least 6 characters</p>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                Confirm Password
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={!!(loading || emailHasError)}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-5 w-5" />
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </div>

                    <div className="text-xs text-center text-gray-600">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                            Privacy Policy
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SignUpPage;