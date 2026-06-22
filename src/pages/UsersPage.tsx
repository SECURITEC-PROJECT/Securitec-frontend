import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Trash2, Pencil, Save } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import { api } from "../services/api";
import type { Role, UserAdmin } from "../types";

const ROLES: { value: Role; label: string }[] = [
  { value: "agent1", label: "Agent 01" },
  { value: "agent2", label: "Agent 02" },
  { value: "agent3", label: "Agent 03" },
  { value: "supervisor", label: "Superviseur" },
];

const AVATARS = ["01", "02", "03", "SV", "04", "05"];

type UserForm = {
  username: string;
  password: string;
  name: string;
  role: Role;
  roleLabel: string;
  vacation: string;
  avatar: string;
};

const emptyForm = (): UserForm => ({
  username: "",
  password: "",
  name: "",
  role: "agent1",
  roleLabel: "Accueil & Administration",
  vacation: "06h-18h",
  avatar: "01",
});

export default function UsersPage() {
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Impossible de charger les utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const supervisorCount = useMemo(() => users.filter((u) => u.role === "supervisor").length, [users]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (user: UserAdmin) => {
    setEditingId(user.id);
    setForm({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role,
      roleLabel: user.roleLabel,
      vacation: user.vacation,
      avatar: user.avatar,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const payload: Record<string, string> = {
          username: form.username,
          name: form.name,
          role: form.role,
          roleLabel: form.roleLabel,
          vacation: form.vacation,
          avatar: form.avatar,
        };
        if (form.password) payload.password = form.password;
        const updated = await api.put(`/users/${editingId}`, payload);
        setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)));
      } else {
        const created = await api.post("/users", form);
        setUsers((prev) => [created, ...prev]);
        setForm(emptyForm());
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      if (editingId === id) startCreate();
    } catch (err: any) {
      setError(err.message || "Impossible de supprimer l'utilisateur.");
    }
  };

  return (
    <>
      <PageHeader
        title="Gestion utilisateurs"
        subtitle="Créer, modifier et retirer les comptes opérateurs depuis MySQL."
      />

      <div className="status-bar">
        <div className="stat-card">
          <div className="stat-head"><ShieldCheck size={18} /><span>Comptes actifs</span></div>
          <div className="stat-value">{users.length}</div>
          <div className="stat-sub">Dont {supervisorCount} superviseur(s)</div>
        </div>
      </div>

      <div className="row2">
        <Panel title={editingId ? "Modifier un utilisateur" : "Créer un utilisateur"} icon={<UserPlus size={16} color="var(--accent)" />}>
          <form className="form-grid" onSubmit={submit}>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="form-input" placeholder="Identifiant" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
              <input className="form-input" type="password" placeholder={editingId ? "Nouveau mot de passe (optionnel)" : "Mot de passe"} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <input className="form-input" placeholder="Nom complet" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              <select className="form-input" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}>
                {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              <input className="form-input" placeholder="Libellé rôle" value={form.roleLabel} onChange={(e) => setForm((p) => ({ ...p, roleLabel: e.target.value }))} />
              <input className="form-input" placeholder="Vacation" value={form.vacation} onChange={(e) => setForm((p) => ({ ...p, vacation: e.target.value }))} />
              <select className="form-input" value={form.avatar} onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}>
                {AVATARS.map((avatar) => <option key={avatar} value={avatar}>{avatar}</option>)}
              </select>
            </div>

            {error && <div className="login-error">{error}</div>}

            <div className="flex gap-2 flex-wrap">
              <button className="btn-primary" type="submit" disabled={saving}>
                <Save size={14} /> {saving ? "Enregistrement..." : editingId ? "Mettre à jour" : "Créer"}
              </button>
              <button className="btn-secondary" type="button" onClick={startCreate}>
                Nouveau compte
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Utilisateurs existants" icon={<Pencil size={16} color="var(--accent)" />}>
          {loading ? (
            <p className="ci-text">Chargement des utilisateurs...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((user) => (
                <div key={user.id} className="vacation-card">
                  <div className="vacation-head" style={{ marginBottom: 8 }}>
                    <div>
                      <div className="vac-title">{user.name}</div>
                      <div className="vac-sub">{user.username} · {user.roleLabel}</div>
                    </div>
                    <span className="pill pill-blue">{user.role.toUpperCase()}</span>
                  </div>
                  <div className="vac-block">Vacation {user.vacation} · Avatar {user.avatar}</div>
                  <div className="flex gap-2 mt-3">
                    <button className="btn-secondary" type="button" onClick={() => startEdit(user)}>Modifier</button>
                    {user.username !== "superviseur" && (
                      <button className="btn-danger" type="button" onClick={() => remove(user.id)}>
                        <Trash2 size={14} /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}