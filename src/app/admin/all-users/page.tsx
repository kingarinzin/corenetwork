"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Power,
  PowerOff,
  Trash2,
  Edit,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileDown
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface User {
  _id: string;
  name: string;
  cid: string;
  designation: string;
  phone: string;
  email: string;
  agencyName: string;
  departmentName: string;
  divisionName: string;
  role: string;
  isActive: boolean;
  isAdmin: boolean;
  isAgencyAdmin: boolean;
  createdAt: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-pink-100 text-pink-600",
    "bg-purple-100 text-purple-600",
    "bg-green-100 text-green-600",
    "bg-teal-100 text-teal-600",
    "bg-orange-100 text-orange-600",
    "bg-red-100 text-red-600",
    "bg-blue-100 text-blue-600",
    "bg-indigo-100 text-indigo-600",
    "bg-yellow-100 text-yellow-600",
    "bg-gray-100 text-gray-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AllUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const adminFlag = localStorage.getItem("isAdmin") === "true";
    setIsSuperAdmin(adminFlag);
    if (!token) {
      router.push("/login");
      return;
    }

    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/all-users", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          localStorage.clear();
          router.push("/login?expired=true");
          return;
        }
        if (!res.ok) {
          setNotification({ message: "Failed to load users", type: "error" });
          return;
        }
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, [router]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAction = async (userId: string, action: "toggleStatus" | "delete", currentStatus?: boolean) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("token");
      let url = "";
      let method: "POST" | "DELETE" = "POST";
      let body: { userId: string; isActive?: boolean } = { userId };

      if (action === "toggleStatus") {
        url = "/api/admin/toggle-user-status";
        body = { userId, isActive: !currentStatus };
      } else if (action === "delete") {
        url = `/api/admin/delete-user?userId=${userId}`;
        method = "DELETE";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: method === "POST" ? JSON.stringify(body) : undefined,
      });

      if (res.ok) {
        showNotification(action === "delete" ? "User deleted" : `User ${!currentStatus ? "activated" : "deactivated"}`, "success");
        const refreshed = await fetch("/api/admin/all-users", { headers: { Authorization: `Bearer ${token}` } });
        const data = await refreshed.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        showNotification(data.error || "Action failed", "error");
      }
    } catch {
      showNotification("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/update-user-role", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        showNotification("Role updated", "success");
        const refreshed = await fetch("/api/admin/all-users", { headers: { Authorization: `Bearer ${token}` } });
        const data = await refreshed.json();
        setUsers(data.users || []);
      } else {
        const data = await res.json();
        showNotification(data.error || "Failed to update role", "error");
      }
    } catch {
      showNotification("Failed to update role", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterDept("");
    setFilterRole("");
    setFilterStatus("");
    setCurrentPage(1);
  };

  // Unique departments for the filter dropdown
  const uniqueDepartments = Array.from(new Set(users.map(u => u.departmentName).filter(Boolean)));

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.cid.includes(search) ||
      u.email.toLowerCase().includes(search.toLowerCase());
      
    const matchesDept = filterDept === "" || u.departmentName === filterDept;
    const matchesRole = filterRole === "" || u.role === filterRole;
    const matchesStatus = filterStatus === "" || 
      (filterStatus === "active" && u.isActive !== false) || 
      (filterStatus === "inactive" && u.isActive === false);

    return matchesSearch && matchesDept && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  if (loading) {
    return (
      <div className="flex w-full min-h-screen bg-[#f9fafb] items-center justify-center">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-screen bg-[#f9fafb] text-gray-900 font-sans">
      
      {/* Fixed Sidebar */}
      <div className="fixed inset-y-0 left-0 z-20 bg-white shadow-sm hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full transition-all duration-300 lg:ml-64 p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto w-full">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all registered users – view, edit roles, activate/deactivate, or delete accounts.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm text-sm font-medium text-gray-700">
              Total users: <span className="font-bold text-blue-600">{users.length}</span>
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${notification.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {notification.message}
            </div>
          )}

          {/* Toolbar (Filters) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-3">
            
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Search name, CID, email..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium ml-2 border-l border-gray-300 pl-3">
                <Filter size={16} />
                Filters:
              </div>

              {/* Dept Filter */}
              <select
                value={filterDept}
                onChange={(e) => { setFilterDept(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[120px]"
              >
                <option value="">All Depts</option>
                {uniqueDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              {/* Role Filter */}
              <select
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Roles</option>
                <option value="Officer">Officer</option>
                <option value="DivisionHead">Division Head</option>
                <option value="DepartmentHead">Department Head</option>
                <option value="Commissioner">Commissioner</option>
                <option value="Chairperson">Chairperson</option>
                <option value="SecretaryService">Secretary Service</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Clear Button */}
              {(search || filterDept || filterRole || filterStatus) && (
                <button 
                  onClick={handleClearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1.5"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Records Counter */}
            <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto xl:ml-0">
              <span>Show</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} 
                className="border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
              </select>
              <span className="font-semibold text-gray-800">{filteredUsers.length} records</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-[1200px] w-full text-left border-collapse">
                <thead className="bg-[#fafafa] border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">User</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">CID</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Designation</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Department</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Division</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Role</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                      {/* User (Avatar + Name + CID) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${getAvatarColor(user.name)}`}>
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                            <div className="text-xs text-gray-500">{user.cid}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{user.cid}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[120px]">{user.designation}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]">{user.departmentName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]">{user.divisionName}</td>
                      
                      {/* Role Dropdown */}
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user._id, e.target.value)}
                          disabled={actionLoading === user._id}
                          className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none w-32"
                        >
                          <option value="Officer">Officer</option>
                          <option value="DivisionHead">Division Head</option>
                          <option value="DepartmentHead">Department Head</option>
                          <option value="Commissioner">Commissioner</option>
                          <option value="Chairperson">Chairperson</option>
                          <option value="SecretaryService">Secretary Service</option>
                        </select>
                      </td>

                      {/* Status Pill */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          user.isActive !== false 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-200 text-gray-700"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive !== false ? "bg-green-500" : "bg-gray-500"}`}></span>
                          {user.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions (Power, Edit, Delete) */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3 text-gray-400">
                          
                          {/* Toggle Status */}
                          <button
                            onClick={() => handleAction(user._id, "toggleStatus", user.isActive)}
                            disabled={actionLoading === user._id}
                            className={`hover:text-red-500 transition ${user.isActive ? 'text-red-400' : 'text-green-500'}`}
                            title={user.isActive ? "Deactivate" : "Activate"}
                          >
                            {actionLoading === user._id ? (
                              <Loader2 className="animate-spin" size={16} />
                            ) : user.isActive ? (
                              <PowerOff size={18} strokeWidth={2.5} />
                            ) : (
                              <Power size={18} strokeWidth={2.5} />
                            )}
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => router.push(`/admin/all-users/${user._id}/edit`)}
                            className="text-blue-500 hover:text-blue-700 transition"
                            title="Edit User"
                          >
                            <Edit size={18} strokeWidth={2.5} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleAction(user._id, "delete")}
                            disabled={actionLoading === user._id}
                            className="text-red-400 hover:text-red-600 transition"
                            title="Delete User"
                          >
                            <Trash2 size={18} strokeWidth={2.5} />
                          </button>

                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedUsers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-gray-500">
                        No users found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 text-sm text-gray-500">
            <div>
              Showing <span className="font-semibold text-gray-800">{filteredUsers.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(startIndex + rowsPerPage, filteredUsers.length)}</span> of <span className="font-semibold text-gray-800">{filteredUsers.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(p => p-1)} 
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(p => p+1)} 
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}