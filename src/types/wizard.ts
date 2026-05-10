/** Dane pomocnicze API kreatora zlecenia własnego (/worker/wizard). */

export type WizardCategory = {
  id: number;
  name: string;
  icon?: string;
  reqCustomer: boolean;
  reqMaterial: boolean;
  reqQuantity: boolean;
  reqTaskDescription: boolean;
  isGlobal: boolean;
};

export type WizardMachine = { id: number; name: string; categoryIds: number[] };

export type WizardMaterial = { id: number; name: string; type?: string | null };

export type WizardCustomer = { id: number; firstName: string | null; lastName: string };
