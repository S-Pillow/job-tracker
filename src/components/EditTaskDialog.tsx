'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, X, AlertCircle } from 'lucide-react';
import { updateTask } from '@/app/actions';
import { editTaskSchema } from '@/lib/validation';
import type { EditTaskInput } from '@/lib/validation';
import type { TaskData } from '@/lib/types';
import { TERMINATION_TYPES, normalizeTerminationType } from '@/lib/constants';

const inputCls =
  'w-full px-3 py-2 rounded-md border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500';

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-1">{error}</p>}
      {children}
    </div>
  );
}

/** Converts a Date | string | null to "YYYY-MM-DD" for <input type="date">. */
function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

/** Build the default form values from the current task. */
function taskToDefaults(task: TaskData): EditTaskInput {
  return {
    registrarName: task.registrarName,
    ianaId: task.ianaId,
    caseNumber: task.caseNumber,
    terminationType: normalizeTerminationType(task.terminationType),
    terminationEffectiveDate: toDateInput(task.terminationEffectiveDate),
    gainingRegistrarName: task.gainingRegistrarName ?? '',
    gainingRegistrarIanaId: task.gainingRegistrarIanaId ?? '',
    icannNoticeDate: toDateInput(task.icannNoticeDate),
    hasGatewayCnTw: task.hasGatewayCnTw,
    oldRegistrarName: task.oldRegistrarName ?? '',
    newRegistrarName: task.newRegistrarName ?? '',
  };
}

interface Props {
  task: TaskData;
}

export function EditTaskDialog({ task }: Props) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isTermination = task.taskType === 'TERMINATION';
  const isNameChange = task.taskType === 'NAME_CHANGE';
  const showGatewayField = isTermination || isNameChange;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditTaskInput>({
    resolver: zodResolver(editTaskSchema) as any,
    defaultValues: taskToDefaults(task),
  });

  const terminationType = watch('terminationType');
  const showIcannNoticeDate = terminationType === 'ICANN Termination';

  function handleOpen() {
    // Always reset to the latest task data when the dialog is opened
    reset(taskToDefaults(task));
    setServerError(null);
    setOpen(true);
  }

  function onSubmit(values: EditTaskInput) {
    setServerError(null);
    startTransition(async () => {
      try {
        // For Name Change, the row identifier (registrarName) tracks the old name
        const submitValues =
          isNameChange
            ? { ...values, registrarName: values.oldRegistrarName || values.registrarName }
            : values;
        await updateTask(task.id, submitValues);
        setOpen(false);
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Save failed — please try again.');
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
      {/* Trigger — rendered inline wherever RegistrarRow places this component */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-600 transition-colors"
      >
        <Pencil size={12} />
        Edit
      </button>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 focus:outline-none"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Edit Case
              <span className="ml-2 text-sm font-normal text-zinc-400 dark:text-zinc-500">{task.caseNumber}</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Common fields ── */}
            <div className="grid grid-cols-2 gap-3">
              {/* Name Change: show old/new name instead of the generic Registrar Name field */}
              {isNameChange ? (
                <>
                  <div className="col-span-2">
                    <Field label="Old Registrar Name" required error={errors.oldRegistrarName?.message}>
                      <p className="text-xs text-zinc-400 mb-1">Current name — being changed from</p>
                      <input {...register('oldRegistrarName')} placeholder="e.g. Acme Corp, Inc." className={inputCls} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="New Registrar Name" error={errors.newRegistrarName?.message}>
                      <p className="text-xs text-zinc-400 mb-1">New name per ICANN notice</p>
                      <input {...register('newRegistrarName')} placeholder="e.g. Acme Registrar LLC" className={inputCls} />
                    </Field>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <Field label="Registrar Name" required error={errors.registrarName?.message}>
                    <input {...register('registrarName')} className={inputCls} />
                  </Field>
                </div>
              )}

              <Field label="IANA ID" required error={errors.ianaId?.message}>
                <input {...register('ianaId')} placeholder="e.g. 1234" className={inputCls} />
              </Field>

              <Field label="Case Number" required error={errors.caseNumber?.message}>
                <input {...register('caseNumber')} placeholder="e.g. 12345678" className={inputCls} />
              </Field>
            </div>

            {/* ── Termination-specific fields ── */}
            {isTermination && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Termination Type">
                  <select {...register('terminationType')} className={inputCls}>
                    <option value="">— Select —</option>
                    {TERMINATION_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Effective Date">
                  <input
                    {...register('terminationEffectiveDate')}
                    type="date"
                    className={inputCls}
                  />
                </Field>

                {showIcannNoticeDate && (
                  <div className="col-span-2">
                    <Field label="ICANN Notice Date">
                      <input {...register('icannNoticeDate')} type="date" className={inputCls} />
                    </Field>
                  </div>
                )}

                <Field label="Gaining Registrar Name">
                  <input
                    {...register('gainingRegistrarName')}
                    placeholder="Optional"
                    className={inputCls}
                  />
                </Field>

                <Field label="Gaining Registrar IANA ID">
                  <input
                    {...register('gainingRegistrarIanaId')}
                    placeholder="Optional"
                    className={inputCls}
                  />
                </Field>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    id="edit-hasGatewayCnTw"
                    type="checkbox"
                    {...register('hasGatewayCnTw')}
                    className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="edit-hasGatewayCnTw"
                    className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                  >
                    Has Gateway CN/TW scope
                  </label>
                </div>
              </div>
            )}

            {/* Gateway checkbox for Name Change */}
            {isNameChange && (
              <div className="flex items-center gap-2">
                <input
                  id="edit-hasGatewayNc"
                  type="checkbox"
                  {...register('hasGatewayCnTw')}
                  className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label
                  htmlFor="edit-hasGatewayNc"
                  className="text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                >
                  Has Gateway accreditation (enables conditional step 7)
                </label>
              </div>
            )}

            {/* Server-side error */}
            {serverError && (
              <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {serverError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 py-2 px-4 rounded-md border border-zinc-200 dark:border-zinc-600 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
