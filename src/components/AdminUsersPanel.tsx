import { useMemo, useState } from "react";
import { Pencil, Plus, UserPlus } from "lucide-react";
import {
  useAdminUsers,
  useCreateAdminUser,
  useCurrentUser,
  usePatchAdminUser,
} from "@/hooks/useGridApi";
import { ASSIGNABLE_ROLES, ROLE_LABELS, canManageUsers } from "@/lib/rbac";
import type { User, UserRole } from "@/types/api";
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

type FormState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  disabled: boolean;
};

const emptyCreate = (): FormState => ({
  name: "",
  email: "",
  password: "",
  role: "member",
  disabled: false,
});

function roleBadgeClass(role: UserRole): string {
  if (role === "superadmin") return "bg-primary/15 text-primary";
  if (role === "admin") return "bg-warning/15 text-warning";
  if (role === "maintainer") return "bg-success/15 text-success";
  if (role === "developer") return "bg-secondary text-foreground";
  return "bg-muted text-muted-foreground";
}

export function AdminUsersPanel() {
  const { data: me, isLoading: meLoading } = useCurrentUser();
  const canManage = canManageUsers(me?.role);
  const { data: users = [], isLoading } = useAdminUsers({ enabled: canManage });
  const createUser = useCreateAdminUser();
  const patchUser = usePatchAdminUser();

  if (!meLoading && !canManage) {
    return <AdminAccessDenied section="Users" />;
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyCreate);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role === "superadmin" && b.role !== "superadmin") return -1;
        if (b.role === "superadmin" && a.role !== "superadmin") return 1;
        return (a.name || a.email).localeCompare(b.name || b.email);
      }),
    [users]
  );

  const openCreate = () => {
    setForm(emptyCreate());
    setError(null);
    setNote(null);
    setCreateOpen(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      name: u.name || "",
      email: u.email,
      password: "",
      role: u.role === "superadmin" ? "superadmin" : u.role,
      disabled: Boolean(u.disabled),
    });
    setError(null);
    setNote(null);
  };

  const submitCreate = async () => {
    setError(null);
    try {
      await createUser.mutateAsync({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role === "superadmin" ? "member" : form.role,
      });
      setCreateOpen(false);
      setNote(`Created ${form.email.trim()} as ${form.role}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    }
  };

  const submitEdit = async () => {
    if (!editUser) return;
    setError(null);
    const isSuper = editUser.role === "superadmin";
    try {
      const body: {
        id: string;
        name?: string;
        role?: UserRole;
        disabled?: boolean;
        password?: string;
      } = { id: editUser.id, name: form.name.trim() };
      if (!isSuper && form.role !== "superadmin") {
        body.role = form.role;
        body.disabled = form.disabled;
      }
      if (form.password.trim()) {
        body.password = form.password;
      }
      await patchUser.mutateAsync(body);
      setEditUser(null);
      setNote(`Updated ${editUser.email}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  const pending = createUser.isPending || patchUser.isPending;

  return (
    <>
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Users</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Create accounts and assign predefined roles. For project-scoped access,
            keep the role as <span className="font-mono">member</span> and add them
            to a custom group —{" "}
            <span className="font-mono">developer</span> /{" "}
            <span className="font-mono">maintainer</span> are global.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isLoading ? "loading…" : `${users.length} users`}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={openCreate}
            disabled={!canManage}
            className="gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add user
          </Button>
        </div>
      </div>

      {(note || error) && (
        <div className="px-4 py-2 border-b border-border text-xs">
          {error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <p className="text-muted-foreground">{note}</p>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading users…</div>
      ) : sorted.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground space-y-3">
          <p>No users yet.</p>
          {canManage && (
            <Button type="button" size="sm" variant="secondary" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add the first user
            </Button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map((u) => {
            const isSelf = me?.id === u.id;
            const isSuper = u.role === "superadmin";
            return (
              <div
                key={u.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {u.name || u.email}
                    </p>
                    {u.disabled && (
                      <span className="text-[10px] uppercase tracking-wide text-destructive">
                        disabled
                      </span>
                    )}
                    {isSelf && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        you
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${roleBadgeClass(
                      u.role
                    )}`}
                  >
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    disabled={!canManage}
                    title={
                      isSuper
                        ? "Edit name / password (role is fixed)"
                        : "Edit user"
                    }
                    onClick={() => openEdit(u)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Starts with the role you pick. Use{" "}
              <span className="font-mono">member</span> for no access until you
              assign a group.
            </DialogDescription>
          </DialogHeader>
          <UserFormFields
            form={form}
            setForm={setForm}
            mode="create"
            showDisable={false}
          />
          {error && createOpen && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={
                pending ||
                !form.email.trim() ||
                !form.name.trim() ||
                form.password.length < 8
              }
            >
              {createUser.isPending ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editUser)}
        onOpenChange={(open) => {
          if (!open) setEditUser(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              {editUser?.role === "superadmin"
                ? "Superadmin role cannot be changed or disabled."
                : "Update name, role, password, or disable the account."}
            </DialogDescription>
          </DialogHeader>
          <UserFormFields
            form={form}
            setForm={setForm}
            mode="edit"
            emailLocked
            roleLocked={editUser?.role === "superadmin"}
            showDisable={editUser?.role !== "superadmin"}
          />
          {error && editUser && (
            <p className="text-xs text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditUser(null)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitEdit()}
              disabled={pending || !form.name.trim()}
            >
              {patchUser.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserFormFields({
  form,
  setForm,
  mode,
  emailLocked,
  roleLocked,
  showDisable,
}: {
  form: FormState;
  setForm: (next: FormState) => void;
  mode: "create" | "edit";
  emailLocked?: boolean;
  roleLocked?: boolean;
  showDisable: boolean;
}) {
  return (
    <div className="space-y-3 py-1">
      <div className="space-y-1.5">
        <Label htmlFor="admin-user-name">Name</Label>
        <Input
          id="admin-user-name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="admin-user-email">Email</Label>
        <Input
          id="admin-user-email"
          type="email"
          value={form.email}
          disabled={emailLocked}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email address"
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="admin-user-password">
          {mode === "create" ? "Password" : "New password (optional)"}
        </Label>
        <Input
          id="admin-user-password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={
            mode === "create" ? "At least 8 characters" : "Leave blank to keep current password"
          }
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="admin-user-role">Role</Label>
        <select
          id="admin-user-role"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          value={form.role}
          disabled={roleLocked}
          onChange={(e) =>
            setForm({ ...form, role: e.target.value as UserRole })
          }
        >
          {roleLocked && form.role === "superadmin" ? (
            <option value="superadmin">{ROLE_LABELS.superadmin}</option>
          ) : (
            ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))
          )}
        </select>
      </div>
      {showDisable && (
        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={form.disabled}
            onChange={(e) => setForm({ ...form, disabled: e.target.checked })}
          />
          Disable account (blocks login)
        </label>
      )}
    </div>
  );
}
