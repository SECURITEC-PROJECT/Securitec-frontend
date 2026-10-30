export interface ExitDetails {
  equipmentOut: boolean;
  extraEquipment: string;
}

export interface VisitorRecord {
  id: string;
  site_id?: string;
  site_type?: string;
  full_name: string;
  company?: string;
  id_document?: string;
  document_type?: string;
  host?: string;
  reason?: string;
  badge?: string;
  vehicle?: string;
  zone?: string;
  equipment?: string;
  entered_at?: string | Date | null;
  exited_at?: string | Date | null;
  site_name?: string;
  site_banned?: boolean;
}
