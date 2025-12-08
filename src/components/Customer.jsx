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

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

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
                )} text-white flex items-center justify-center font-bold`}
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

            {/* Sticky Header */}
            <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 p-6 shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center">
                    <div className="flex items-center">
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

                    <div className="flex gap-3 mt-4 lg:mt-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl w-72"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6">

                {/* Table Container */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">

                    {/* SCROLL FIX APPLIED HERE */}
                    <div className="overflow-auto max-h-[calc(100vh-260px)]">

                        {loading ? (
                            <div className="p-12 text-center">
                                <Loader className="w-8 h-8 animate-spin mx-auto" />
                                <p className="mt-4 text-gray-600">Loading customers...</p>
                            </div>
                        ) : error ? (
                            <div className="p-8 text-center bg-red-50 text-red-800">
                                {error}
                            </div>
                        ) : filteredAndSortedCustomers.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                No customers found
                            </div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {[
                                            { key: "name", label: "Customer", icon: Users },
                                            { key: "email", label: "Email", icon: Mail },
                                            { key: "contactNo", label: "Contact", icon: Phone },
                                            { key: "customerId", label: "Customer ID", icon: IdCard },
                                            { key: "referralCode", label: "Referral", icon: Gift }
                                        ].map(({ key, label, icon: Icon }) => (
                                            <th 
                                                key={key}
                                                className="p-4 text-left text-sm font-semibold cursor-pointer"
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
                                    {filteredAndSortedCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-gray-50">
                                            <td className="p-4">
                                                <div className="flex items-center">
                                                    <CustomerAvatar name={customer.name} />
                                                    <span className="ml-3">{customer.name}</span>
                                                </div>
                                            </td>

                                            <td className="p-4">{customer.email || "—"}</td>
                                            <td className="p-4">{customer.contactNo || "—"}</td>

                                            <td className="p-4">
                                                <span className="bg-gray-100 px-2 py-1 rounded">
                                                    {customer.customerId}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                {customer.referralCode ? (
                                                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                                                        {customer.referralCode}
                                                    </span>
                                                ) : "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default CustomerDirectory;
