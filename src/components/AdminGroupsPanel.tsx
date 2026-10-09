import { useMemo, useState } from "react";
import { Plus, UsersRound } from "lucide-react";
import {
  useAdminGroups,
  useAdminUsers,
  useCreateAccessGroup,
  useCurrentUser,
  useEnvironments,
  usePatchAccessGroup,
  useProjects,
} from "@/hooks/useGridApi";
import { canManageUsers } from "@/lib/rbac";
import type { AccessGroup, AccessLevel, DomainPermissionMap } from "@/types/api";
import { AdminAccessDenied } from "@/components/AdminAccessDenied";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_DOMAINS: DomainPermissionMap = {
  infrastructure: "read",
  kubernetes: "read",
  monitoring: "read",
  apm: "read",
  logs: "read",
  topology: "read",
  secrets: "none",
};

const LEVELS: AccessLevel[] = ["none", "read", "write"];

export function AdminGroupsPanel() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const canManage = canManageUsers(me?.role);
  const { data: groupsPayload, isLoading } = useAdminGroups({ enabled: canManage });
  const { data: users = [] } = useAdminUsers({ enabled: canManage });
  const { data: projects = [] } = useProjects();
  const { data: environments = [] } = useEnvironments();
  const createGroup = useCreateAccessGroup();
  const patchGroup = usePatchAccessGroup();

  if (!meLoading && !canManage) {
    return <AdminAccessDenied section="Groups & RBAC" />;
  }

  const groups = groupsPayload?.groups ?? [];
  const catalog = groupsPayload?.domainCatalog ?? [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<AccessGroup | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectSlugs, setProjectSlugs] = useState<string[]>(["*"]);
  const [envSlugs, setEnvSlugs] = useState<string[]>(["*"]);
  const [domains, setDomains] = useState<DomainPermissionMap>({ ...DEFAULT_DOMAINS });
  const [memberIds, setMemberIds] = useState<string[]>([]);

  const userById = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u]));
    return map;
  }, [users]);

  const customGroups = groups.filter((g) => !g.system);
  const systemGroups = groups.filter((g) => g.system);

  const resetCreate = () => {
    setSlug("");
    setName("");
    setDescription("");
    setProjectSlugs(["*"]);
    setEnvSlugs(["*"]);
    setDomains({ ...DEFAULT_DOMAINS });
    setMemberIds([]);
    setError(null);
  };

  const openCreate = () => {
    resetCreate();
    setCreateOpen(true);
  };

  const openEdit = (g: AccessGroup) => {
    setEditGroup(g);
    setName(g.name);
    setDescription(g.description || "");
    const grant = g.permissions.grants?.[0];
    setProjectSlugs(grant?.projects?.length ? [...grant.projects] : ["*"]);
    setEnvSlugs(grant?.environments?.length ? [...grant.environments] : ["*"]);
    setDomains({
      ...DEFAULT_DOMAINS,
      ...(grant?.domains || g.permissions.domains || {}),
    });
    setMemberIds([...g.memberUserIds]);
    setError(null);
  };

  const toggleMulti = (
    current: string[],
    value: string,
    set: (next: string[]) => void,
    allToken = "*"
  ) => {
    if (value === allToken) {
      set([allToken]);
      return;
    }
    const withoutAll = current.filter((v) => v !== allToken);
    if (withoutAll.includes(value)) {
      const next = withoutAll.filter((v) => v !== value);
      set(next.length ? next : [allToken]);
    } else {
      set([...withoutAll, value]);
    }
  };

  const toggleMember = (id: string) => {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitCreate = async () => {
    setError(null);
    try {
      await createGroup.mutateAsync({
        slug: slug.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        projects: projectSlugs,
        environments: envSlugs,
        domains,
        memberUserIds: memberIds,
      });
      setCreateOpen(false);
      setNote(`Created group ${slug.trim()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    }
  };

  const submitEdit = async () => {
    if (!editGroup) return;
    setError(null);
    try {
      await patchGroup.mutateAsync({
        slug: editGroup.slug,
        name: name.trim(),
        description: description.trim(),
        projects: projectSlugs,
        environments: envSlugs,
        domains,
        memberUserIds: memberIds,
      });
      setEditGroup(null);
      setNote(`Updated group ${editGroup.slug}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update group");
    }
  };

  const pending = createGroup.isPending || patchGroup.isPending;
  const domainRows =
    catalog.length > 0
      ? catalog
      : Object.keys(DEFAULT_DOMAINS).map((id) => ({
          id,
          label: id,
          description: "",
          levels: LEVELS,
        }));

  return (
    <>
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
            <UsersRound className="w-4 h-4" />
            Groups &amp; RBAC
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Built-in groups mirror predefined roles (global access). Custom groups
            grant project × environment × domain access only for users whose role
            stays <span className="font-mono">member</span>. Assigning{" "}
            <span className="font-mono">developer</span> or higher ignores custom
            group project filters. Write via custom groups always requires approval.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreate}
          disabled={!canManage}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          New custom group
        </Button>
      </div>

      {(note || error) && !createOpen && !editGroup && (
        <div className="px-4 py-2 border-b border-border text-xs">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <p className="text-muted-foreground">{note}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading groups…</div>
      ) : (
        <div className="divide-y divide-border">
          <div className="px-4 py-2 bg-secondary/30">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Built-in (from roles)
            </p>
          </div>
          {systemGroups.map((g) => (
            <GroupRow
              key={g.id}
              group={g}
              memberNames={g.memberUserIds
                .map((id) => userById.get(id)?.email || id)
                .slice(0, 6)}
              memberCount={g.memberUserIds.length}
              onEdit={undefined}
            />
          ))}

          <div className="px-4 py-2 bg-secondary/30">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Custom groups
            </p>
          </div>
          {customGroups.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No custom groups yet. Create one to scope access for members.
            </div>
          ) : (
            customGroups.map((g) => (
              <GroupRow
                key={g.id}
                group={g}
                memberNames={g.memberUserIds
                  .map((id) => userById.get(id)?.email || id)
                  .slice(0, 6)}
                memberCount={g.memberUserIds.length}
                onEdit={canManage ? () => openEdit(g) : undefined}
              />
            ))
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New custom group</DialogTitle>
            <DialogDescription>
              Pick projects, environments, and domain levels, then add members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="group-slug">Slug</Label>
                <Input
                  id="group-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="group-slug"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="group-name">Name</Label>
                <Input
                  id="group-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="group-desc">Description</Label>
              <Input
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <ScopePickers
              projects={projects.map((p) => p.slug || p.id)}
              environments={environments.map((e) => e.slug)}
              projectSlugs={projectSlugs}
              envSlugs={envSlugs}
              onToggleProject={(v) => toggleMulti(projectSlugs, v, setProjectSlugs)}
              onToggleEnv={(v) => toggleMulti(envSlugs, v, setEnvSlugs)}
            />
            <DomainEditors
              rows={domainRows}
              domains={domains}
              onChange={(id, level) =>
                setDomains((prev) => ({ ...prev, [id]: level }))
              }
            />
            <MemberPicker
              users={users.filter((u) => u.role !== "superadmin")}
              selected={memberIds}
              onToggle={toggleMember}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !slug.trim() || !name.trim()}
              onClick={() => void submitCreate()}
            >
              {createGroup.isPending ? "Creating…" : "Create group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editGroup)}
        onOpenChange={(open) => {
          if (!open) setEditGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editGroup?.slug}</DialogTitle>
            <DialogDescription>
              Update grants and membership for this custom group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-group-desc">Description</Label>
              <Input
                id="edit-group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <ScopePickers
              projects={projects.map((p) => p.slug || p.id)}
              environments={environments.map((e) => e.slug)}
              projectSlugs={projectSlugs}
              envSlugs={envSlugs}
              onToggleProject={(v) => toggleMulti(projectSlugs, v, setProjectSlugs)}
              onToggleEnv={(v) => toggleMulti(envSlugs, v, setEnvSlugs)}
            />
            <DomainEditors
              rows={domainRows}
              domains={domains}
              onChange={(id, level) =>
                setDomains((prev) => ({ ...prev, [id]: level }))
              }
            />
            <MemberPicker
              users={users.filter((u) => u.role !== "superadmin")}
              selected={memberIds}
              onToggle={toggleMember}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setEditGroup(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !name.trim()}
              onClick={() => void submitEdit()}
            >
              {patchGroup.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function GroupRow({
  group,
  memberNames,
  memberCount,
  onEdit,
}: {
  group: AccessGroup;
  memberNames: string[];
  memberCount: number;
  onEdit?: () => void;
}) {
  const grant = group.permissions.grants?.[0];
  const scopeLabel =
    group.permissions.scope === "global"
      ? "All projects · all environments"
      : `${(grant?.projects || ["*"]).join(", ")} · ${(
          grant?.environments || ["*"]
        ).join(", ")}`;

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-foreground">{group.name}</p>
          <span className="text-[10px] font-mono text-muted-foreground">
            {group.slug}
          </span>
          {group.system && (
            <span className="text-[10px] uppercase text-muted-foreground">system</span>
          )}
        </div>
        {group.description && (
          <p className="text-xs text-muted-foreground">{group.description}</p>
        )}
        <p className="text-[11px] text-muted-foreground">{scopeLabel}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {memberCount === 0
            ? "No members"
            : `${memberCount} member${memberCount === 1 ? "" : "s"}: ${memberNames.join(
                ", "
              )}${memberCount > memberNames.length ? "…" : ""}`}
        </p>
      </div>
      {onEdit && (
        <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
      )}
    </div>
  );
}

function ScopePickers({
  projects,
  environments,
  projectSlugs,
  envSlugs,
  onToggleProject,
  onToggleEnv,
}: {
  projects: string[];
  environments: string[];
  projectSlugs: string[];
  envSlugs: string[];
  onToggleProject: (v: string) => void;
  onToggleEnv: (v: string) => void;
}) {
  const projectOptions = ["*", ...projects.filter(Boolean)];
  const envOptions = ["*", ...environments.filter(Boolean)];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ChipSet
        label="Projects"
        options={projectOptions}
        selected={projectSlugs}
        onToggle={onToggleProject}
      />
      <ChipSet
        label="Environments"
        options={envOptions}
        selected={envSlugs}
        onToggle={onToggleEnv}
      />
    </div>
  );
}

function ChipSet({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt === "*" ? "All (*)" : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DomainEditors({
  rows,
  domains,
  onChange,
}: {
  rows: Array<{ id: string; label: string; levels?: readonly AccessLevel[] }>;
  domains: DomainPermissionMap;
  onChange: (id: string, level: AccessLevel) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Domain access</Label>
      <div className="rounded-md border border-border divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <span className="text-xs text-foreground">{row.label || row.id}</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={domains[row.id] || "none"}
              onChange={(e) => onChange(row.id, e.target.value as AccessLevel)}
            >
              {(row.levels || LEVELS).map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function MemberPicker({
  users,
  selected,
  onToggle,
}: {
  users: Array<{ id: string; email: string; name: string; role: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Members</Label>
      {users.length === 0 ? (
        <p className="text-xs text-muted-foreground">No users to assign yet.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
          {users.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-secondary/40"
            >
              <input
                type="checkbox"
                className="rounded border-border"
                checked={selected.includes(u.id)}
                onChange={() => onToggle(u.id)}
              />
              <span className="text-foreground truncate">
                {u.name || u.email}
              </span>
              <span className="text-muted-foreground truncate">{u.email}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
