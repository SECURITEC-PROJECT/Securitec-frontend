import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Badge, Button, Icon } from "../../../components/ui";
import type { IconName } from "../../../components/ui";
import { fetchSites } from "../../sites/services/sites";
import { useCurrentUser, usePermissions } from "../../auth";
import type { Site } from "../../sites";
import { UserFormModal } from "../components/UserFormModal";
import type { UserTarget } from "../components/UserFormModal";
import { RolesPanel } from "../components/RolesPanel";
import { UserIdCard } from "../components/UserIdCard";
import { useRoles } from "../hooks/useRoles";
import { useUsers } from "../hooks/useUsers";
import type { AccessUser, UserInput } from "../types";
import styles from "./UsersPage.module.css";

type View = "list" | "card";
type StatusFilter = "all" | "active" | "inactive";

const loadView = (): View => {
  try {
    return localStorage.getItem("securitec:users-view") === "list"
      ? "list"
      : "card";
  } catch {
    return "card";
  }
};

export function UsersPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const me = useCurrentUser();
  const { users, loading, error, create, update, deactivate } = useUsers();
  const rolesApi = useRoles();
  const { roles, error: rolesError, reload: reloadRoles } = rolesApi;
  const [sites, setSites] = useState<Site[]>([]);
  const [target, setTarget] = useState<UserTarget | null>(null);
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState<View>(loadView);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  useEffect(() => {
    fetchSites()
      .then(setSites)
      .catch(() => undefined);
  }, []);

  const chooseView = (next: View) => {
    setView(next);
    try {
      localStorage.setItem("securitec:users-view", next);
    } catch {
      // préférence non mémorisée : sans conséquence
    }
  };

  const stats = useMemo(() => {
    const active = users.filter((user) => user.active).length;
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      sites: new Set(users.map((user) => user.siteId).filter(Boolean)).size,
    };
  }, [users]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        (status === "all" || (status === "active") === user.active) &&
        (!roleFilter || user.roleAccessId === roleFilter) &&
        (!siteFilter || user.siteId === siteFilter) &&
        (!needle ||
          [user.name, user.matricule, user.identifier].some((value) =>
            value.toLowerCase().includes(needle),
          )),
    );
  }, [users, search, roleFilter, siteFilter, status]);
  const filtered = Boolean(
    search || roleFilter || siteFilter || status !== "all",
  );

  const handleSave = async (id: string | null, input: UserInput) => {
    if (id) await update(id, input);
    else await create(input);
    // Les rôles affichent leur nombre d'utilisateurs : on le remet à jour.
    void reloadRoles();
    setTarget(null);
  };

  const handleDeactivate = async (user: AccessUser) => {
    if (
      !window.confirm(
        `Désactiver le compte de ${user.name} ? Il ne pourra plus se connecter.`,
      )
    )
      return;
    setActionError("");
    try {
      await deactivate(user.id);
      void reloadRoles();
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : "Désactivation impossible.",
      );
    }
  };

  const canDeactivate = (user: AccessUser) =>
    can("users.delete") && user.active && user.id !== me.id;

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.main}>
          <PageHeader
            title="Utilisateurs"
            subtitle="Créez les comptes, attribuez-leur un rôle et un site."
            actions={
              can("users.create") && (
                <Button
                  type="button"
                  onClick={() => setTarget({ mode: "new" })}
                  disabled={roles.length === 0}
                >
                  Nouvel utilisateur
                </Button>
              )
            }
          />

          <div className={styles.stats}>
            <StatCard
              label="Utilisateurs"
              value={stats.total}
              icon="users"
              color="#1f78c1"
              active={status === "all"}
              onClick={() => setStatus("all")}
            />
            <StatCard
              label="Actifs"
              value={stats.active}
              icon="account"
              color="#2e9e6a"
              active={status === "active"}
              onClick={() => setStatus("active")}
            />
            <StatCard
              label="Désactivés"
              value={stats.inactive}
              icon="close"
              color="#d32f2f"
              active={status === "inactive"}
              onClick={() => setStatus("inactive")}
            />
            <StatCard
              label="Sites concernés"
              value={stats.sites}
              icon="home"
              color="#7939b8"
            />
          </div>

          <div className={styles.toolbar}>
            <select
              className={styles.viewSelect}
              value={view}
              onChange={(event) => chooseView(event.target.value as View)}
              aria-label="Affichage"
            >
              <option value="card">Afficher en card</option>
              <option value="list">Afficher en liste</option>
            </select>
            <div className={styles.filters}>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher (nom, matricule, identifiant)…"
                aria-label="Rechercher"
              />
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Filtrer par rôle"
              >
                <option value="">Tous les rôles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.nom}
                  </option>
                ))}
              </select>
              <select
                value={siteFilter}
                onChange={(event) => setSiteFilter(event.target.value)}
                aria-label="Filtrer par site"
              >
                <option value="">Tous les sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              {filtered && (
                <button
                  type="button"
                  className={styles.reset}
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("");
                    setSiteFilter("");
                    setStatus("all");
                  }}
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {(error || rolesError || actionError) && (
            <p className={styles.error}>{error || rolesError || actionError}</p>
          )}
          {loading && <p className={styles.status}>Chargement...</p>}
          {!loading && visible.length === 0 && (
            <p className={styles.status}>Aucun utilisateur ne correspond.</p>
          )}

          {view === "list" ? (
            <div className={styles.wrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Matricule</th>
                    <th>Identifiant</th>
                    <th>Rôle</th>
                    <th>Site</th>
                    <th>Statut</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => (
                    <tr
                      key={user.id}
                      className={user.active ? "" : styles.inactive}
                    >
                      <td className={styles.name}>
                        <button
                          type="button"
                          className={styles.link}
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          title="Paramètres et droits"
                        >
                          {user.name}
                        </button>
                      </td>
                      <td>{user.matricule}</td>
                      <td>{user.identifier}</td>
                      <td>{user.roleAccessName ?? "—"}</td>
                      <td>
                        {user.siteName ??
                          (user.profile === 1 ? "Tous les sites" : "—")}
                      </td>
                      <td>
                        <Badge
                          tone={user.active ? "success" : "neutral"}
                          size="sm"
                        >
                          {user.active ? "Actif" : "Désactivé"}
                        </Badge>
                      </td>
                      <td className={styles.actions}>
                        {can("users.update") && (
                          <button
                            type="button"
                            className={styles.icon}
                            onClick={() => setTarget({ mode: "edit", user })}
                            aria-label="Modifier"
                          >
                            <Icon
                              name="edit"
                              size={16}
                              color="var(--color-primary)"
                            />
                          </button>
                        )}
                        {canDeactivate(user) && (
                          <button
                            type="button"
                            className={styles.icon}
                            onClick={() => void handleDeactivate(user)}
                            aria-label="Désactiver"
                          >
                            <Icon
                              name="trash"
                              size={16}
                              color="var(--color-danger)"
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.cards}>
              {visible.map((user) => (
                <UserIdCard
                  key={user.id}
                  user={user}
                  onOpen={() => navigate(`/admin/users/${user.id}`)}
                  onEdit={
                    can("users.update")
                      ? () => setTarget({ mode: "edit", user })
                      : undefined
                  }
                  onDeactivate={
                    canDeactivate(user)
                      ? () => void handleDeactivate(user)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
        {can("roles.view") && <RolesPanel {...rolesApi} />}
      </div>

      <UserFormModal
        target={target}
        roles={roles}
        sites={sites}
        onSave={handleSave}
        onClose={() => setTarget(null)}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: IconName;
  color: string;
  active?: boolean;
  onClick?: () => void;
}

/** Petite carte de chiffre clé ; cliquable, elle filtre la liste par statut. */
function StatCard({
  label,
  value,
  icon,
  color,
  active,
  onClick,
}: StatCardProps) {
  const content = (
    <>
      <span className={styles.statIcon} style={{ background: `${color}1f` }}>
        <Icon name={icon} size={22} color={color} />
      </span>
      <span>
        <strong>{value}</strong>
        <small>{label}</small>
      </span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className={`${styles.stat} ${styles.clickable} ${active ? styles.statActive : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {content}
    </button>
  ) : (
    <div className={styles.stat}>{content}</div>
  );
}
