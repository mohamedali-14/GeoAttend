import { useState } from "react";
import { Search, Shield, UserX, UserCheck, ChevronDown, Trash2, Edit3, X, Save, AlertTriangle } from "lucide-react";
import AdminLayout from "./AdminLayout";
import { useMockData } from "../../context/MockDataContext";
import { useAuth } from "../../context/AuthContext";
import type { User } from "../../context/AuthContext";
import Breadcrumbs from "../../components/Breadcrumbs";

/* ── Delete Confirm Modal ── */
function DeleteModal({ user, onConfirm, onCancel }: { user: User; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/20 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">Delete User</h3>
            <p className="text-slate-400 text-sm">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm mb-6">
          Are you sure you want to delete <span className="text-white font-semibold">{user.firstName} {user.lastName}</span>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */
function EditModal({ user, onSave, onCancel }: { user: User; onSave: (data: Partial<User>) => void; onCancel: () => void }) {
  const [firstName,   setFirstName]   = useState(user.firstName);
  const [lastName,    setLastName]    = useState(user.lastName);
  const [department,  setDepartment]  = useState(user.department || "");
  const [studentID,   setStudentID]   = useState(user.studentID  || "");

  const inp = "w-full bg-[#1E293B] border border-slate-700 text-white p-2.5 rounded-lg focus:outline-none focus:border-purple-500 transition-all placeholder:text-slate-500 text-sm";
  const lbl = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-bold text-lg flex items-center gap-2"><Edit3 className="w-5 h-5 text-purple-400" />Edit User</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>First Name</label><input value={firstName} onChange={e => setFirstName(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Last Name</label><input value={lastName} onChange={e => setLastName(e.target.value)} className={inp} /></div>
          </div>
          {user.role !== "ADMIN" && (
            <div><label className={lbl}>Department</label><input value={department} onChange={e => setDepartment(e.target.value)} className={inp} placeholder="e.g. Computer Science" /></div>
          )}
          {user.role === "STUDENT" && (
            <div><label className={lbl}>Student ID</label><input value={studentID} onChange={e => setStudentID(e.target.value)} className={inp} placeholder="e.g. 20240001" /></div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={onCancel} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition-colors border border-slate-700">Cancel</button>
            <button onClick={() => onSave({ firstName, lastName, department: department || undefined, studentID: studentID || undefined })}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Action Dropdown ── */
function ActionMenu({ targetUser, onClose, onEdit, onDelete }: {
  targetUser: User; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const { user: me } = useAuth();
  const { banUser, unbanUser, promoteToAdmin, demoteFromAdmin } = useMockData();
  const isMe = me?.id === targetUser.id;
  const isOriginal = targetUser.id === "3";

  return (
    <div className="absolute right-0 top-8 bg-[#1E293B] border border-slate-700 rounded-xl shadow-2xl z-20 w-52 overflow-hidden">
      {isMe || isOriginal ? (
        <div className="px-4 py-3 text-sm text-slate-500">Cannot modify {isMe ? "yourself" : "original admin"}</div>
      ) : (
        <>
          <button onClick={() => { onEdit(); onClose(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-blue-400 hover:bg-slate-700 transition-colors">
            <Edit3 className="w-4 h-4" />Edit User
          </button>
          {targetUser.isBanned ? (
            <button onClick={() => { unbanUser(targetUser.id); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-400 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
              <UserCheck className="w-4 h-4" />Unban User
            </button>
          ) : (
            <button onClick={() => { banUser(targetUser.id); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-orange-400 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
              <UserX className="w-4 h-4" />Ban User
            </button>
          )}
          {targetUser.role !== "ADMIN" && (
            <button onClick={() => { promoteToAdmin(targetUser.id); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-purple-400 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
              <Shield className="w-4 h-4" />Make Admin
            </button>
          )}
          {targetUser.role === "ADMIN" && (
            <>
              <button onClick={() => { demoteFromAdmin(targetUser.id, "DOCTOR"); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-blue-400 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
                Set as Doctor
              </button>
              <button onClick={() => { demoteFromAdmin(targetUser.id, "STUDENT"); onClose(); }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#00D084] hover:bg-slate-700 transition-colors">
                Set as Student
              </button>
            </>
          )}
          <button onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-slate-700 transition-colors border-t border-slate-700/50">
            <Trash2 className="w-4 h-4" />Delete User
          </button>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Page
   ══════════════════════════════════════════ */
export default function AdminUsers() {
  const { users, deleteUser, updateUserInList } = useMockData();
  const [search,       setSearch]       = useState("");
  const [roleFilter,   setRoleFilter]   = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | BANNED
  const [openMenu,     setOpenMenu]     = useState<string | null>(null);
  const [editUser,     setEditUser]     = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = `${u.firstName} ${u.lastName} ${u.email} ${u.studentID || ""}`.toLowerCase().includes(q);
    const matchRole   = roleFilter   === "ALL" || u.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || (statusFilter === "BANNED" ? u.isBanned : !u.isBanned);
    return matchSearch && matchRole && matchStatus;
  });

  const counts = {
    ALL: users.length,
    STUDENT: users.filter(u => u.role === "STUDENT").length,
    DOCTOR:  users.filter(u => u.role === "DOCTOR").length,
    ADMIN:   users.filter(u => u.role === "ADMIN").length,
  };

  const roleColor = (role: string) => ({
    ADMIN:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
    DOCTOR:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
    STUDENT: "bg-slate-700 text-slate-300 border-slate-600",
  }[role] || "");

  return (
    <AdminLayout>
      {editUser && (
        <EditModal user={editUser}
          onSave={d => { updateUserInList(editUser.id, d); setEditUser(null); }}
          onCancel={() => setEditUser(null)} />
      )}
      {deleteTarget && (
        <DeleteModal user={deleteTarget}
          onConfirm={() => { deleteUser(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}

      <div className="p-6 md:p-10 max-w-7xl mx-auto" onClick={() => openMenu && setOpenMenu(null)}>
        <Breadcrumbs items={[{ label: "Users" }]} />
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">User Management</h1>
          <p className="text-slate-400 text-sm">Manage all users, roles, and permissions.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(["ALL","STUDENT","DOCTOR","ADMIN"] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`rounded-xl p-4 border text-left transition-all ${roleFilter === r ? "border-purple-500/40 bg-purple-500/10" : "border-slate-800 bg-[#111827] hover:border-slate-700"}`}>
              <p className={`text-2xl font-bold ${roleFilter === r ? "text-purple-400" : "text-white"}`}>{counts[r]}</p>
              <p className="text-slate-400 text-xs mt-1">{r === "ALL" ? "Total Users" : r === "DOCTOR" ? "Doctors" : r.charAt(0) + r.slice(1).toLowerCase() + "s"}</p>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email or student ID..."
              className="w-full bg-[#111827] border border-slate-800 text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 transition-all text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#111827] border border-slate-800 text-slate-300 px-3 py-2.5 rounded-lg focus:outline-none focus:border-purple-500 text-sm">
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {["User", "Email", "Role", "Department / ID", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          u.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" :
                          u.role === "DOCTOR" ? "bg-blue-500/20 text-blue-400" : "bg-[#00D084]/20 text-[#00D084]"
                        }`}>{u.firstName[0]}{u.lastName[0]}</div>
                        <span className="text-white font-medium text-sm">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{u.email}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${roleColor(u.role)}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">
                      {u.department && <div>{u.department}</div>}
                      {u.studentID  && <div className="text-xs text-slate-500">ID: {u.studentID}</div>}
                      {!u.department && !u.studentID && "—"}
                    </td>
                    <td className="px-5 py-4">
                      {u.isBanned
                        ? <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Banned</span>
                        : <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Active</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors border border-slate-700">
                          Actions <ChevronDown className="w-3 h-3" />
                        </button>
                        {openMenu === u.id && (
                          <ActionMenu targetUser={u}
                            onClose={() => setOpenMenu(null)}
                            onEdit={() => setEditUser(u)}
                            onDelete={() => setDeleteTarget(u)} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No users found matching your search.
            </div>
          )}
          <div className="px-5 py-3 border-t border-slate-800 text-slate-500 text-xs">
            Showing {filtered.length} of {users.length} users
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
