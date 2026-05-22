'use client';

import { useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSimpleTask } from '@/app/actions';

const schema = z.object({
  registrarName: z.string().min(1, 'Required'),
  ianaId: z.string().min(1, 'Required'),
  caseNumber: z.string().min(1, 'Required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewNameChangeDialog({ open, onOpenChange }: Props) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      await createSimpleTask('NAME_CHANGE', values);
      reset();
      onOpenChange(false);
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
