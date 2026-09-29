import React, { useMemo, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  ShieldCheck,
  UserCog,
  Users,
  BookOpen,
  Building2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  AppUserRecord,
  ClassRoomRecord,
  SubjectCatalogRecord,
  UserRole,
} from '../../types/graduation';
import { SUPABASE_USER_TABLE_SQL } from '../../lib/supabase';
import { TablePagination } from './TablePagination';

interface UserManagementSectionProps {
  users: AppUserRecord[];
  classRooms: ClassRoomRecord[];
  subjectCatalog?: SubjectCatalogRecord[];
  onSaveUser: (user: AppUserRecord) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSyncSupabaseTables?: () => Promise<{ ok: boolean; message: string }>;
}

const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string; desc: string }> = {
  admin: {
    label: 'Admin / Operator',
    badgeClass: 'bg-palette-primary text-white border-palette-primary',
    desc: 'Hak akses penuh pengelolaan sistem, kelulusan, kelas, siswa, nilai, dan pengaturan.',
  },
  wali_kelas: {
    label: 'Wali Kelas',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    desc: 'Mengelola & memantau ketuntasan siswa serta SKL pada kelas binaan masing-masing.',
  },
  guru: {
    label: 'Guru Mata Pelajaran',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    desc: 'Menginput dan memverifikasi nilai ujian mata pelajaran yang diampu.',
  },
};

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  users,
  classRooms,
  subjectCatalog = [],
  onSaveUser,
  onDeleteUser,
  onSyncSupabaseTables,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ ok: boolean; text: string } | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [nip, setNip] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [assignedClass, setAssignedClass] = useState('');
  const [accessPin, setAccessPin] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.nip.toLowerCase().includes(q) ||
        u.assignedClass.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, roleFilter]);

  const roleCounts = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      wali_kelas: users.filter((u) => u.role === 'wali_kelas').length,
      guru: users.filter((u) => u.role === 'guru').length,
    };
  }, [users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

  const openAddModal = () => {
    setEditingId(null);
    setFullName('');
    setUsername('');
    setNip('');
    setRole('wali_kelas');
    setAssignedClass(classRooms[0]?.className || 'XII MIPA 1');
    setAccessPin('sipinter2026');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: AppUserRecord) => {
    setEditingId(user.id);
    setFullName(user.fullName);
    setUsername(user.username);
    setNip(user.nip);
    setRole(user.role);
    setAssignedClass(user.assignedClass);
    setAccessPin(user.accessPin);
    setIsActive(user.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCopyUserTableSql = () => {
    navigator.clipboard.writeText(SUPABASE_USER_TABLE_SQL);
    setCopiedSql(true);
    setStatusBanner({
      ok: true,
      text: 'Script SQL tabel public.app_users berhasil disalin! Tempel dan jalankan di SQL Editor Supabase.',
    });
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSyncUsers = async () => {
    if (!onSyncSupabaseTables) return;
    setIsSyncing(true);
    try {
      const res = await onSyncSupabaseTables();
      setStatusBanner({
        ok: res.ok,
        text: res.ok
          ? `Data manajemen user (${users.length} akun) berhasil disinkronkan ke tabel public.app_users di Supabase.`
          : res.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = fullName.trim();
    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanPin = accessPin.trim();

    if (!cleanName || !cleanUser || !cleanPin) {
      setFormError('Nama Lengkap, Username, dan Kode Akses / Password wajib diisi.');
      return;
    }

    const duplicate = users.find(
      (u) => u.id !== editingId && u.username.toLowerCase() === cleanUser
    );
    if (duplicate) {
      setFormError(`Username "${cleanUser}" sudah digunakan oleh ${duplicate.fullName}.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload: AppUserRecord = {
        id: editingId || `usr-${Date.now()}`,
        fullName: cleanName,
        username: cleanUser,
        nip: nip.trim() || '-',
        role,
        assignedClass:
          assignedClass.trim() ||
          (role === 'admin' ? 'Semua Kelas' : role === 'wali_kelas' ? 'XII MIPA 1' : 'Mata Pelajaran Umum'),
        accessPin: cleanPin,
        isActive,
        updatedAt: new Date().toISOString(),
      };
      await onSaveUser(payload);
      setIsModalOpen(false);
      setStatusBanner({
        ok: true,
        text: `User "${payload.fullName}" (Role: ${ROLE_LABELS[payload.role].label}) berhasil disimpan dan diperbarui ke tabel public.app_users.`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: AppUserRecord) => {
    await onSaveUser({
      ...user,
      isActive: !user.isActive,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Actions */}
      <div className="bg-white border border-palette-accent rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-palette-accent/70">
          <div>
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-palette-primary" />
              <h2 className="text-base font-semibold text-palette-text">
                Manajemen User & Hak Akses Role (&ldquo;Sipinter-Lulus&rdquo; - SMAN 1 Lumbung Ciamis)
              </h2>
            </div>
            <p className="text-xs text-palette-text/70 mt-0.5">
              Kelola akun pengguna dengan role <strong>Admin</strong>, <strong>Guru</strong>, dan{' '}
              <strong>Wali Kelas</strong> yang terhubung ke tabel{' '}
              <code className="font-mono text-palette-primary">public.app_users</code> di Supabase
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGuideOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-primary bg-palette-accent/50 border border-palette-accent rounded-lg hover:bg-palette-accent transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Panduan Tambah User</span>
              {isGuideOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleCopyUserTableSql}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 transition-colors cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="text-emerald-800">SQL Tabel User Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-palette-primary" />
                  <span>Copy SQL Tabel User</span>
                </>
              )}
            </button>

            {onSyncSupabaseTables && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSyncUsers}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/60 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan ke Supabase'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah User Baru</span>
            </button>
          </div>
        </div>

        {/* Role Summary Pills & Search Filter */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-palette-text/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama user, username, NIP, atau kelas/mapel..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary text-palette-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `Semua Role (${roleCounts.total})` },
                { id: 'admin', label: `Admin (${roleCounts.admin})` },
                { id: 'wali_kelas', label: `Wali Kelas (${roleCounts.wali_kelas})` },
                { id: 'guru', label: `Guru (${roleCounts.guru})` },
              ] as { id: 'ALL' | UserRole; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  roleFilter === tab.id
                    ? 'bg-palette-primary text-white'
                    : 'bg-palette-background text-palette-text/80 hover:bg-palette-accent/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Guide */}
      {isGuideOpen && (
        <div className="bg-white border border-palette-primary/35 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-palette-accent">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-palette-accent/60 text-palette-primary flex items-center justify-center shrink-0">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-palette-text">
                  Panduan Pengisian Data Manajemen User (Admin, Guru, Wali Kelas)
                </h3>
                <p className="text-xs text-palette-text/70">
                  Penjelasan kolom wajib dan cara menambahkan role pengguna baru ke sistem
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideOpen(false)}
              className="text-xs font-semibold text-palette-text/60 hover:text-palette-text cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-palette-background border border-palette-accent space-y-2">
              <p className="font-bold text-palette-text">1. Apa Saja yang Harus Diisi?</p>
              <ul className="space-y-1.5 text-palette-text/80">
                <li>
                  • <strong>Role Pengguna (Wajib):</strong> Pilih <em>Admin / Operator</em>,{' '}
                  <em>Wali Kelas</em>, atau <em>Guru Mata Pelajaran</em>.
                </li>
                <li>
                  • <strong>Nama Lengkap & Gelar (Wajib):</strong> Nama resmi pendidik atau operator
                  sekolah.
                </li>
                <li>
                  • <strong>Username & Kode Akses / PIN (Wajib):</strong> Digunakan saat login masuk
                  ke Dashboard Admin.
                </li>
                <li>
                  • <strong>Kelas Binaan / Mata Pelajaran:</strong> Pilih rombel kelas (untuk Wali
                  Kelas) atau tulis mata pelajaran yang diampu (untuk Guru).
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-palette-background border border-palette-accent space-y-2">
              <p className="font-bold text-palette-text">2. Langkah Menyimpan ke Supabase</p>
              <ol className="space-y-1.5 text-palette-text/80 list-decimal list-inside">
                <li>
                  Pastikan tabel <code className="font-mono">public.app_users</code> sudah dibuat di
                  Supabase dengan klik tombol <strong>Copy SQL Tabel User</strong> lalu jalankan di
                  SQL Editor Supabase.
                </li>
                <li>
                  Klik <strong>+ Tambah User Baru</strong>, lengkapi formulir, lalu klik{' '}
                  <strong>Simpan User</strong>.
                </li>
                <li>
                  User yang berstatus <strong>Aktif</strong> dapat langsung login menggunakan
                  Username atau Kode Aksesnya.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Status Notification */}
      {statusBanner && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            statusBanner.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[11px] font-semibold underline cursor-pointer shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-palette-accent rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-palette-accent/45 border-b border-palette-accent text-xs font-semibold text-palette-text">
                <th className="py-3 px-4 w-14 text-center">No</th>
                <th className="py-3 px-4">Nama Lengkap & NIP</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Role Akses</th>
                <th className="py-3 px-4">Kelas Binaan / Mapel</th>
                <th className="py-3 px-4">Kode Akses (PIN)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-palette-accent/60 text-sm">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-xs text-palette-text/60">
                    Tidak ada data user yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const rowNumber = (safePage - 1) * pageSize + idx + 1;
                  const roleMeta = ROLE_LABELS[u.role] || ROLE_LABELS.guru;
                  const isDeleting = confirmDeleteId === u.id;
                  const isPinShown = Boolean(revealedPins[u.id]);

                  return (
                    <tr key={u.id} className="hover:bg-palette-accent/20 transition-colors">
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-palette-accent/60 font-mono tabular-nums text-xs font-bold text-palette-text">
                          {rowNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-palette-text">{u.fullName}</div>
                        <div className="text-xs font-mono tabular-nums text-palette-text/65">
                          NIP: {u.nip || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-palette-text">
                        @{u.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleMeta.badgeClass}`}
                        >
                          {u.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {u.role === 'wali_kelas' && <Building2 className="w-3.5 h-3.5" />}
                          {u.role === 'guru' && <BookOpen className="w-3.5 h-3.5" />}
                          <span>{roleMeta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium text-palette-text">
                        {u.assignedClass || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs bg-palette-background border border-palette-accent px-2.5 py-1 rounded">
                          <span>{isPinShown ? u.accessPin : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPins((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                            }
                            className="text-palette-text/60 hover:text-palette-primary cursor-pointer"
                            title={isPinShown ? 'Sembunyikan PIN' : 'Lihat PIN'}
                          >
                            {isPinShown ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-0.5 rounded text-xs font-semibold border cursor-pointer ${
                            u.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-slate-100 border-slate-300 text-slate-600'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                await onDeleteUser(u.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 text-xs font-semibold bg-rose-700 text-white rounded hover:bg-rose-800 cursor-pointer"
                            >
                              Ya, Hapus
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-palette-text bg-palette-accent/50 rounded hover:bg-palette-accent cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="p-1.5 text-palette-text/75 hover:text-palette-primary hover:bg-palette-accent/40 rounded-md transition-colors cursor-pointer"
                              title="Edit User"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(u.id)}
                              className="p-1.5 text-palette-text/75 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Hapus User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={safePage}
          totalItems={filteredUsers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemLabel="pengguna"
        />
      </div>

      {/* Modal Add / Edit User */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-palette-accent rounded-xl max-w-lg w-full overflow-hidden shadow-lg">
            <div className="px-6 py-4 border-b border-palette-accent flex items-center justify-between bg-palette-background">
              <div>
                <h3 className="font-display text-lg font-bold text-palette-text">
                  {editingId ? 'Edit Data User & Role' : 'Tambah User Baru'}
                </h3>
                <p className="text-xs text-palette-text/70">
                  Pilih role (Admin, Guru, atau Wali Kelas) beserta kredensial aksesnya
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-palette-text/70 hover:text-palette-text rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-palette-text mb-1.5">
                  Role Pengguna *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'wali_kelas', 'guru'] as UserRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRole(r);
                        if (r === 'admin' && !assignedClass) setAssignedClass('Semua Kelas');
                        if (r === 'wali_kelas' && classRooms.length > 0) {
                          setAssignedClass(classRooms[0].className);
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                        role === r
                          ? 'bg-palette-primary text-white border-palette-primary'
                          : 'bg-palette-background text-palette-text border-palette-accent hover:bg-palette-accent/40'
                      }`}
                    >
                      {r === 'admin' ? 'Admin' : r === 'wali_kelas' ? 'Wali Kelas' : 'Guru'}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-palette-text/65 mt-1">
                  {ROLE_LABELS[role].desc}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Fauzi, M.M."
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    NIP / NUPTK
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Contoh: 19760412 200212 2 003"
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Username Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: wali_mipa1"
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-palette-text mb-1">
                    Kode Akses / Password Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={accessPin}
                    onChange={(e) => setAccessPin(e.target.value)}
                    placeholder="Contoh: sipinter2026"
                    className="w-full px-3 py-2 text-xs font-mono bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-palette-text mb-1">
                  {role === 'wali_kelas'
                    ? 'Kelas Binaan Wali Kelas *'
                    : role === 'guru'
                      ? 'Mata Pelajaran yang Diampu *'
                      : 'Cakupan Akses Unit'}
                </label>
                {role === 'wali_kelas' && classRooms.length > 0 ? (
                  <select
                    value={assignedClass}
                    onChange={(e) => setAssignedClass(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                  >
                    {classRooms.map((c) => (
                      <option key={c.id} value={c.className}>
                        {c.className} ({c.major}) — {c.homeroomTeacher}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={assignedClass}
                      onChange={(e) => setAssignedClass(e.target.value)}
                      placeholder={
                        role === 'guru'
                          ? 'Contoh: MTK - Matematika'
                          : 'Contoh: Semua Kelas / Kurikulum'
                      }
                      className="w-full px-3 py-2 text-xs bg-palette-background border border-palette-accent rounded-lg focus:outline-none focus:border-palette-primary"
                    />
                    {role === 'guru' && subjectCatalog.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-palette-text/70">
                          Pilih cepat dari Katalog Mata Pelajaran:
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-0.5">
                          {subjectCatalog.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setAssignedClass(`${sub.code} — ${sub.name}`)}
                              className="px-2 py-1 text-[11px] font-mono bg-palette-background border border-palette-accent rounded hover:bg-palette-accent/60 text-palette-text cursor-pointer"
                            >
                              {sub.code} · {sub.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-palette-accent flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-palette-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-palette-primary rounded cursor-pointer"
                  />
                  <span>Status Akun Aktif (Dapat Login)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-palette-text bg-palette-background border border-palette-accent rounded-lg hover:bg-palette-accent/50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-palette-primary rounded-lg hover:bg-palette-text disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Menyimpan...' : 'Simpan User'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
