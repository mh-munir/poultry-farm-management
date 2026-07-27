'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LoaderCircle, CheckCircle2, AlertCircle, Send, ShieldCheck, UserPlus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendAdminCreationOtp, verifyAdminCreationOtp, createAdminAccount } from '@/app/dashboard/settings/users/actions';

type Step = 'details' | 'otp' | 'creating' | 'done';

interface CreateAdminFormProps {
  onAdminCreated?: () => void;
}

export default function CreateAdminForm({ onAdminCreated }: CreateAdminFormProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const otpSentAt = useRef<number>(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      countdownRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resendCooldown > 0]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('contact', channel === 'EMAIL' ? email : phone);
    formData.append('channel', channel);

    const result = await sendAdminCreationOtp(formData);
    setLoading(false);

    if ((result as any)?.error) {
      showError((result as any).error);
    } else {
      setOtpSent(true);
      otpSentAt.current = Date.now();
      setStep('otp');
      showSuccess('OTP sent successfully.');
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const otpCode = otpDigits.join('');
    const formData = new FormData();
    formData.append('contact', channel === 'EMAIL' ? email : phone);
    formData.append('code', otpCode);

    const result = await verifyAdminCreationOtp(formData);
    setLoading(false);

    if ((result as any)?.error) {
      showError((result as any).error);
      setOtpDigits(['', '', '', '', '', '']);
      return;
    }

    await handleCreateAdmin(otpCode);
  }

  async function handleCreateAdmin(otpCode: string) {
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', phone);
    formData.append('password', password);
    formData.append('confirmPassword', confirmPassword);
    formData.append('contact', channel === 'EMAIL' ? email : phone);
    formData.append('channel', channel);
    formData.append('otpCode', otpCode);

    const result = await createAdminAccount(formData);
    setLoading(false);

    if ((result as any)?.error) {
      showError((result as any).error);
      setStep('otp');
      return;
    }

    showSuccess((result as any)?.success ?? 'Admin account created successfully.');
    setStep('done');
    onAdminCreated?.();
  }

  function handleOtpDigitChange(index: number, value: string) {
    if (value.length > 1) value = value[value.length - 1];
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otpDigit${index + 1}`);
      nextInput?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otpDigit${index - 1}`);
      prevInput?.focus();
    }
  }

  function handleResendOtp() {
    setOtpDigits(['', '', '', '', '', '']);
    setOtpSent(false);
    setStep('details');
  }

  function resetForm() {
    setStep('details');
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpSent(false);
    setResendCooldown(0);
    otpSentAt.current = 0;
  }

  const remainingSeconds = resendCooldown;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Admin creation</p>
        <h2 className="mt-2 text-2xl font-semibold">Create new admin</h2>
        <p className="mt-2 text-sm text-muted-foreground">Add a new administrator account with OTP verification.</p>
      </div>

      {step === 'done' ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <p className="text-lg font-semibold">Admin account created successfully.</p>
          <button type="button" onClick={resetForm} className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Create another admin
          </button>
        </div>
      ) : step === 'creating' ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Creating admin account...</p>
        </div>
      ) : step === 'otp' ? (
        <form onSubmit={handleVerifyOtp} className="grid gap-4">
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">OTP sent</p>
            <p className="mt-1">
              We sent a 6-digit verification code to{' '}
              <span className="font-semibold">{channel === 'EMAIL' ? email : phone}</span> via {channel === 'EMAIL' ? 'email' : 'SMS'}.
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium">Verification code</label>
            <div className="flex gap-2 justify-center">
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  id={`otpDigit${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-12 rounded-md border bg-background text-center text-xl tracking-widest focus:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  autoFocus={i === 0}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" disabled={loading || otpDigits.some(d => !d)}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify OTP
          </button>

          <div className="flex items-center justify-between">
            <button type="button" onClick={handleResendOtp} className="text-sm text-muted-foreground hover:text-foreground">
              Change contact details
            </button>
            {remainingSeconds > 0 ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Resend in {remainingSeconds}s
              </span>
            ) : (
              otpSentAt.current > 0 && (Date.now() - otpSentAt.current < 30000) && (
                <button type="button" onClick={async () => {
                  const formData = new FormData();
                  formData.append('contact', channel === 'EMAIL' ? email : phone);
                  formData.append('channel', channel);
                  const result = await sendAdminCreationOtp(formData);
                  if ((result as any)?.error) {
                    showError((result as any).error);
                  } else {
                    otpSentAt.current = Date.now();
                    showSuccess('OTP resent successfully.');
                  }
                }} className="text-sm text-primary hover:underline">
                  Resend OTP
                </button>
              )
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleSendOtp} className="grid gap-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
            <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder="Admin name" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder="admin@example.com" />
            </div>
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">Mobile Number</label>
              <input id="phone" name="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder="+1234567890" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder="Min. 8 characters" />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder="Repeat password" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Send OTP via</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="channel" value="EMAIL" checked={channel === 'EMAIL'} onChange={() => setChannel('EMAIL')} />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="channel" value="SMS" checked={channel === 'SMS'} onChange={() => setChannel('SMS')} />
                Mobile Number
              </label>
            </div>
          </div>

          <button type="submit" className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send OTP
          </button>
        </form>
      )}
    </div>
  );
}