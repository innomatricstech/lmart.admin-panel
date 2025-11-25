import React, { useState, useEffect, useMemo } from "react";
import { 
    Search,
    Download,
    Users,
    Loader,
    AlertTriangle,
    Mail,
    Phone,
    IdCard,
    Gift,
    ChevronDown,
    ChevronUp
} from 'lucide-react'; 

// Firebase
import { db } from "../../firerbase";
import { 
    collection, 
    onSnapshot,
    orderBy,
    query
} from "firebase/firestore";

// Helper for avatar color
const getInitialColor = (name) => {
    if (!name) return "from-gray-500 to-gray-600";
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
        "from-blue-500 to-blue-600",
        "from-green-500 to-green-600", 
        "from-purple-500 to-purple-600",
        "from-red-500 to-red-600",
        "from-indigo-500 to-indigo-600",
        "from-teal-500 to-teal-600",
        "from-pink-500 to-pink-600",
        "from-orange-500 to-orange-600"
    ];
    return colors[hash % colors.length];
};

const CustomerDirectory = () => {
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState("customerId");
    const [sortDirection, setSortDirection] = useState("desc");

    // ----------------------------------------------------------
    // FETCH CUSTOMERS FROM /users
    // ----------------------------------------------------------
    useEffect(() => {
        try {
            const q = query(
                collection(db, "users"),
                orderBy("customerId", "desc")
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    setCustomers(list);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error fetching users:", err);
                    setError("Failed to load customers. Check Firestore rules.");
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("Firestore error:", err);
            setError("Failed to connect to Firestore.");
            setLoading(false);
        }
    }, []);

    // ----------------------------------------------------------
    // SORTING
    // ----------------------------------------------------------
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // ----------------------------------------------------------
    // FILTER & SORT
    // ----------------------------------------------------------
    const filteredAndSortedCustomers = useMemo(() => {
        const s = searchTerm.toLowerCase();
        const filtered = customers.filter((customer) => {
            return (
                (customer.name || "").toLowerCase().includes(s) ||
                (customer.email || "").toLowerCase().includes(s) ||
                (customer.contactNo || "").toLowerCase().includes(s) ||
                (customer.customerId || "").toLowerCase().includes(s)
            );
        });

        return filtered.sort((a, b) => {
            const aValue = a[sortField] || "";
            const bValue = b[sortField] || "";
            
            if (sortDirection === "asc") {
                return aValue.toString().localeCompare(bValue.toString());
            } else {
                return bValue.toString().localeCompare(aValue.toString());
            }
        });
    }, [customers, searchTerm, sortField, sortDirection]);

    const CustomerAvatar = ({ name, className = "w-10 h-10" }) => {
        const initial = name ? name.charAt(0).toUpperCase() : "?";
        return (
            <div
                className={`${className} rounded-full bg-gradient-to-br ${getInitialColor(
                    name
                )} text-white flex items-center justify-center font-bold shadow-lg`}
            >
                {initial}
            </div>
        );
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-50" />;
        return sortDirection === "asc" ? 
            <ChevronUp className="w-4 h-4" /> : 
            <ChevronDown className="w-4 h-4" />;
    };

    const exportToCSV = () => {
        const headers = ["Name", "Email", "Contact No", "Customer ID", "Referral Code"];
        const csvData = filteredAndSortedCustomers.map(customer => [
            customer.name || "",
            customer.email || "",
            customer.contactNo || "",
            customer.customerId || "",
            customer.referralCode || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...csvData.map(row => row.map(field => `"${field}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "customers.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // ----------------------------------------------------------
    // UI
    // ----------------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 p-6 shadow-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center mb-4 lg:mb-0">
                            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl shadow-lg">
                                <Users className="text-white w-8 h-8" />
                            </div>
                            <div className="ml-4">
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                    Customer Directory
                                </h1>
                                <p className="text-gray-600 text-sm mt-1">
                                    Manage and explore your customer database
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                                    placeholder="Search by name, email, phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            
                            <button
                                onClick={exportToCSV}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                            >
                                <Download className="w-5 h-5" />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="flex items-center">
                            <div className="bg-blue-100 p-3 rounded-xl">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Customers</p>
                                <p className="text-2xl font-bold text-gray-900">{customers.length}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                        <div className="flex items-center">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Mail className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Filtered Results</p>
                                <p className="text-2xl font-bold text-gray-900">{filteredAndSortedCustomers.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Table */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    {loading && (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                                <Loader className="w-8 h-8 text-white animate-spin" />
                            </div>
                            <p className="mt-4 text-gray-600 font-medium">Loading customer data...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-8 text-center bg-red-50 border-b border-red-200">
                            <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-xl mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to load customers</h3>
                            <p className="text-red-600 max-w-md mx-auto">{error}</p>
                        </div>
                    )}

                    {!loading && !error && filteredAndSortedCustomers.length === 0 && (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center p-4 bg-gray-100 rounded-2xl mb-4">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No customers found</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                {searchTerm ? "Try adjusting your search terms" : "No customers in the database yet"}
                            </p>
                        </div>
                    )}

                    {!loading && !error && filteredAndSortedCustomers.length > 0 && (
                        <div className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                            {[
                                                { key: "name", label: "Customer", icon: Users },
                                                { key: "email", label: "Email", icon: Mail },
                                                { key: "contactNo", label: "Contact", icon: Phone },
                                                { key: "customerId", label: "Customer ID", icon: IdCard },
                                                { key: "referralCode", label: "Referral", icon: Gift }
                                            ].map(({ key, label, icon: Icon }) => (
                                                <th 
                                                    key={key}
                                                    className="p-4 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-200/50 transition-colors duration-150 group"
                                                    onClick={() => handleSort(key)}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Icon className="w-4 h-4 text-gray-500" />
                                                        <span>{label}</span>
                                                        <SortIcon field={key} />
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-gray-100">
                                        {filteredAndSortedCustomers.map((customer, index) => (
                                            <tr 
                                                key={customer.id}
                                                className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/50 transition-all duration-200 group cursor-pointer"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <CustomerAvatar name={customer.name} />
                                                        <div className="ml-3">
                                                            <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                                                                {customer.name || "Unknown"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center text-gray-700">
                                                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                                        {customer.email || "—"}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center text-gray-700">
                                                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                                        {customer.contactNo || "—"}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <IdCard className="w-4 h-4 mr-2 text-gray-400" />
                                                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded-lg text-gray-800">
                                                            {customer.customerId || "—"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center">
                                                        <Gift className="w-4 h-4 mr-2 text-gray-400" />
                                                        {customer.referralCode ? (
                                                            <span className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                                                                {customer.referralCode}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                {!loading && !error && filteredAndSortedCustomers.length > 0 && (
                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            Showing <span className="font-semibold text-gray-700">{filteredAndSortedCustomers.length}</span> of{" "}
                            <span className="font-semibold text-gray-700">{customers.length}</span> customers
                            {searchTerm && (
                                <span> for "<span className="font-semibold text-gray-700">{searchTerm}</span>"</span>
                            )}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CustomerDirectory;