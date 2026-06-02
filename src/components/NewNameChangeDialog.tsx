'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSimpleTask } from '@/app/actions';
import { simpleTaskSchema, type SimpleTaskInput } from '@/lib/validation';

type FormValues = SimpleTaskInput;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewNameChangeDialog({ open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(simpleTaskSchema) as any });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      try {
        await createSimpleTask('NAME_CHANGE', values);
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
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl shadow-xl w-full max-w-md p-6 focus:outline-none">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-zinc-900">
              Add Name Change
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
              <X size={16} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Registrar Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('registrarName')}
                placeholder="e.g. Acme Registrar, Inc."
                className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {errors.registrarName && (
                <p className="text-xs text-red-600 mt-1">{errors.registrarName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  IANA ID <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('ianaId')}
                  placeholder="e.g. 1234"
                  className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                {errors.ianaId && (
                  <p className="text-xs text-red-600 mt-1">{errors.ianaId.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Case Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('caseNumber')}
                  placeholder="e.g. 12345678"
                  className="w-full border border-zinc-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                {errors.caseNumber && (
                  <p className="text-xs text-red-600 mt-1">{errors.caseNumber.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="nc-hasGateway"
                type="checkbox"
                {...register('hasGatewayCnTw')}
                className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="nc-hasGateway" className="text-sm text-zinc-700 cursor-pointer select-none">
                Has Gateway accreditation (enables conditional step 7)
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

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Adding…' : 'Add Name Change'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
