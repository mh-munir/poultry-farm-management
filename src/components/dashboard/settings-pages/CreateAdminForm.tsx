'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, LoaderCircle, CheckCircle2, Send, ShieldCheck, Clock } from 'lucide-react';
import { useLocale } from '@/i18n/provider';
import { useToast } from '@/hooks/use-toast';
import { sendAdminCreationOtp, verifyAdminCreationOtp, createAdminAccount } from '@/app/dashboard/settings/users/actions';

type Step = 'details' | 'otp' | 'creating' | 'done';

interface CreateAdminFormProps {
  onAdminCreated?: () => void;
}

export default function CreateAdminForm({ onAdminCreated }: CreateAdminFormProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { dict } = useLocale();
  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
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
    formData.append('contact', email);

    const result = await sendAdminCreationOtp(formData);
    setLoading(false);

    if ((result as any)?.error) {
      showError((result as any).error);
    } else {
      otpSentAt.current = Date.now();
      setStep('otp');
      showSuccess(dict.settings.otpSentSuccess);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const otpCode = otpDigits.join('');
    const formData = new FormData();
    formData.append('contact', email);
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
    formData.append('contact', email);
    formData.append('channel', 'EMAIL');
    formData.append('otpCode', otpCode);

    const result = await createAdminAccount(formData);
    setLoading(false);

    if ((result as any)?.error) {
      showError((result as any).error);
      setStep('otp');
      return;
    }

    showSuccess((result as any)?.success ?? dict.settings.adminCreatedSuccess);
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
    setResendCooldown(0);
    otpSentAt.current = 0;
  }

  const remainingSeconds = resendCooldown;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{dict.settings.adminCreation}</p>
        <h2 className="mt-2 text-2xl font-semibold">{dict.settings.createNewAdmin}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{dict.settings.adminCreationDescription}</p>
      </div>

      {step === 'done' ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <p className="text-lg font-semibold">{dict.settings.adminCreatedSuccess}</p>
          <button type="button" onClick={resetForm} className="rounded-full border px-4 py-2 text-sm font-medium hover:bg-slate-50">
            {dict.settings.createAnotherAdmin}
          </button>
        </div>
      ) : step === 'creating' ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{dict.settings.creatingAdmin}</p>
        </div>
      ) : step === 'otp' ? (
        <form onSubmit={handleVerifyOtp} className="grid gap-4">
          <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">{dict.settings.otpSent}</p>
            <p className="mt-1">
              {dict.settings.otpSentDescription} <span className="font-semibold">{email}</span>.
            </p>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium">{dict.auth.verificationCode}</label>
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
            {dict.settings.verifyOtp}
          </button>

          <div className="flex items-center justify-between">
            <button type="button" onClick={handleResendOtp} className="text-sm text-muted-foreground hover:text-foreground">
              {dict.settings.changeContactDetails}
            </button>
            {remainingSeconds > 0 ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {dict.settings.resendIn.replace('{seconds}', String(remainingSeconds))}
              </span>
            ) : (
              otpSentAt.current > 0 && (Date.now() - otpSentAt.current < 30000) && (
                <button type="button" onClick={async () => {
                  const formData = new FormData();
                  formData.append('contact', email);
                  const result = await sendAdminCreationOtp(formData);
                  if ((result as any)?.error) {
                    showError((result as any).error);
                  } else {
                    otpSentAt.current = Date.now();
                    showSuccess('OTP resent successfully.');
                  }
                }} className="text-sm text-primary hover:underline">
                  {dict.settings.resendOtp}
                </button>
              )
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleSendOtp} className="grid gap-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">{dict.settings.fullName}</label>
            <input id="name" name="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder={dict.settings.adminName} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">{dict.common.email}</label>
              <input id="email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder={dict.auth.youExample} />
            </div>
            <div>
              <label htmlFor="phone" className="mb-2 block text-sm font-medium text-slate-700">{dict.settings.mobileNumber}</label>
              <input id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none" placeholder={dict.settings.phonePlaceholder} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">{dict.common.password}</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={passwordVisible ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none"
                  placeholder={dict.settings.passwordMinHint}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                  title={passwordVisible ? 'Hide password' : 'Show password'}
                >
                  {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">{dict.common.confirmPassword}</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={confirmPasswordVisible ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none"
                  placeholder={dict.settings.repeatPassword}
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible((visible) => !visible)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={confirmPasswordVisible ? 'Hide password' : 'Show password'}
                  title={confirmPasswordVisible ? 'Hide password' : 'Show password'}
                >
                  {confirmPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {dict.settings.sendOtp}
          </button>
        </form>
      )}
    </div>
  );
}
