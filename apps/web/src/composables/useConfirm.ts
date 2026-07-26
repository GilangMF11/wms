import { useConfirm } from 'primevue/useconfirm';

export function useConfirmAction() {
  const confirm = useConfirm();

  function ask(message: string, acceptCb: () => void) {
    confirm.require({
      message,
      header: 'Konfirmasi',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: { label: 'Batal', severity: 'secondary', outlined: true },
      acceptProps: { label: 'Ya', severity: 'danger' },
      accept: acceptCb,
    });
  }

  return { ask };
}
