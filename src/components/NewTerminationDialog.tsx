'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTerminationTask } from '@/app/actions';
import { terminationTaskSchema, type TerminationTaskInput } from '@/lib/validation';
import type { NewTerminationFormData } from '@/lib/types';
import { TERMINATION_TYPES } from '@/lib/constants';

type FormValues = TerminationTaskInput;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-zinc-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  'w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition';

export function NewTerminationDialog({ open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(terminationTaskSchema) as any,
    defaultValues: { hasGatewayCnTw: false, terminationType: '' },
  });

  const terminationType = useWatch({ control, name: 'terminationType' });
  const showIcannNoticeDate = terminationType === 'ICANN Termination';

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        await createTerminationTask(values as NewTerminationFormData);
        reset();
        onOpenChange(false);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl p-6 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-zinc-900">
              New Termination
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-600 transition-colors rounded-md p-1 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Registrar Name" error={errors.registrarName?.message} required>
                  <input
                    {...register('registrarName')}
                    placeholder="e.g. Acme Registrar LLC"
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field label="IANA ID" error={errors.ianaId?.message} required>
                <input
                  {...register('ianaId')}
                  placeholder="e.g. 1234"
                  className={inputCls}
                />
              </Field>

              <Field label="Case Number" error={errors.caseNumber?.message} required>
                <input
                  {...register('caseNumber')}
                  placeholder="e.g. 12345678"
                  className={inputCls}
                />
              </Field>

              <Field label="Termination Type" error={errors.terminationType?.message}>
                <select {...register('terminationType')} className={inputCls}>
                  <option value="">— Select —</option>
                  {TERMINATION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Effective Date" error={errors.terminationEffectiveDate?.message}>
                <input
                  {...register('terminationEffectiveDate')}
                  type="date"
                  className={inputCls}
                />
              </Field>

              {showIcannNoticeDate && (
                <div className="col-span-2">
                  <Field label="ICANN Notice Date" error={errors.icannNoticeDate?.message}>
                    <input
                      {...register('icannNoticeDate')}
                      type="date"
                      className={inputCls}
                    />
                  </Field>
                </div>
              )}

              <Field
                label="Gaining Registrar Name"
                error={errors.gainingRegistrarName?.message}
              >
                <input
                  {...register('gainingRegistrarName')}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>

              <Field
                label="Gaining Registrar IANA ID"
                error={errors.gainingRegistrarIanaId?.message}
              >
                <input
                  {...register('gainingRegistrarIanaId')}
                  placeholder="Optional"
                  className={inputCls}
                />
              </Field>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="hasGatewayCnTw"
                type="checkbox"
                {...register('hasGatewayCnTw')}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="hasGatewayCnTw"
                className="text-sm text-zinc-700 cursor-pointer"
              >
                Has Gateway CN/TW scope (enables conditional step 8)
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                Your name <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <input
                {...register('createdBy')}
                placeholder="e.g. Jane Smith"
                className="w-full px-3 py-2 rounded-md border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 placeholder:text-zinc-400"
              />
            </div>

            {serverError && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 py-2 px-4 rounded-md border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 px-4 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Creating...' : 'Create Termination'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
