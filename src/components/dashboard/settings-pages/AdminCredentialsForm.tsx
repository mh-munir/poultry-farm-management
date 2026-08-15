'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AdminImageUploader from '@/components/admin-image-uploader';
import { updateAdminCredentials } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { useLocale } from '@/i18n/provider';

type Props = { currentName: string; currentEmail: string; currentImage: string };

const inputClass = 'h-12 w-full rounded-xl border border-slate-200 bg-white px-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-100';

export default function AdminCredentialsForm({ currentName, currentEmail, currentImage }: Props) {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { update } = useSession();
  const router = useRouter();
  const { dict } = useLocale();
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleFormAction(_prev: unknown, formData: FormData) {
    const result = await updateAdminCredentials(formData);
    if (result.success) {
      showToastSuccess(result.success);
      setIsSuccess(true);
      await update?.();
      router.refresh();
    } else if (result.error) {
      showToastError(result.error);
    }
    return result;
  }

  const [, formAction] = useActionState(handleFormAction, null);

  return (
    <form action={formAction} onSubmit={() => setIsSuccess(false)} className="space-y-6">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_330px]">
        <section className="space-y-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-green-700"><UserRound className="h-4 w-4" />{dict.settings.accountInformation}</h3>
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">{dict.settings.adminName}</label>
            <div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" /><input id="name" name="name" type="text" defaultValue={currentName} className={inputClass} /></div>
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">{dict.settings.adminEmail}</label>
            <div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" /><input id="email" name="email" type="email" defaultValue={currentEmail} required className={inputClass} /></div>
          </div>
        </section>

        <section className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-green-700"><UserRound className="h-4 w-4" />{dict.settings.profilePhoto}</h3>
          <AdminImageUploader existingImageUrl={currentImage} onImageUploaded={() => {}} />
        </section>
      </div>

      <section className="rounded-2xl border border-green-100 bg-green-50/60 p-5 sm:p-6">
        <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold text-green-800"><LockKeyhole className="h-4 w-4" />{dict.settings.security}</h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div><label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">{dict.common.newPassword}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" /><input id="password" name="password" type="password" placeholder={dict.settings.passwordBlankHint} className={inputClass} /></div></div>
          <div><label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-slate-700">{dict.common.confirmPassword}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" /><input id="confirmPassword" name="confirmPassword" type="password" placeholder={dict.settings.repeatPassword} className={inputClass} /></div></div>
        </div>
        <p className="mt-3 text-sm text-slate-500">{dict.settings.passwordHint}</p>
      </section>

      <div className="flex gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-slate-600"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-white"><ShieldCheck className="h-5 w-5" /></span><p><span className="block font-semibold text-slate-800">{dict.settings.securityNoteTitle}</span>{dict.settings.securityNoteBody}</p></div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><Button type="reset" variant="outline">{dict.common.cancel}</Button><Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={isSuccess}>{isSuccess ? dict.settings.saved : dict.settings.saveChanges}</Button></div>
    </form>
  );
}
