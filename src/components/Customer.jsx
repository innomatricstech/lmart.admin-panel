import React, { useState, useEffect, useMemo } from "react";
import { 
    Search,
    Download,
    Users,
    Loader,
    Mail,
    Phone,
    IdCard,
    Gift,
    ChevronDown,
    ChevronUp,
    Ban, 
    CheckCircle,
    AlertTriangle
} from 'lucide-react';

// --- Firebase/Firestore Imports ---
// NOTE: Ensure your Firebase config file is correctly located at this path.
import { db } from "../../firerbase"; 
import { 
    collection, 
    onSnapshot,
    orderBy,
    query,
    doc,        
    updateDoc   
} from "firebase/firestore";

// --- Main Component ---
const CustomerDirectory = () => {
    
    // Internal States for Data and UI Management
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState("customerId");
    const [sortDirection, setSortDirection] = useState("desc");
    const [updateInProgress, setUpdateInProgress] = useState(null); // Tracks which customer block/unblock action is running

    // 1. FIREBASE DATA FETCHING (Real-time listener)
    useEffect(() => {
        try {
            // Create a query to order by customerId (important for initial load order)
            const q = query(
                collection(db, "users"),
                orderBy("customerId", "desc") 
            );

            // Set up the real-time listener (onSnapshot)
            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id, // Firestore document ID
                        ...doc.data()
                    }));

                    setCustomers(list);
                    setLoading(false);
                },
                (err) => {
                    console.error("Error fetching users:", err);
                    setError("Failed to load customers. Check Firestore connection/rules.");
                    setLoading(false);
                }
            );

            // Cleanup function to unsubscribe from the listener
            return () => unsubscribe();
        } catch (err) {
            console.error("Firestore setup error:", err);
            setError("Failed to initialize Firestore.");
            setLoading(false);
        }
    }, []);

    // 2. FIREBASE BLOCK STATUS TOGGLE FUNCTION
    const toggleBlockStatus = async (customerId, currentStatus) => {
        setUpdateInProgress(customerId);
        setError(null);
        
        try {
            // customerId here is the Firestore document ID (doc.id)
            const customerRef = doc(db, "users", customerId);
            const newStatus = !currentStatus;
            
            await updateDoc(customerRef, {
                isBlocked: newStatus,
            });
            
            // UI updates automatically via the onSnapshot listener
        } catch (err) {
            console.error("Error updating block status:", err);
            setError(`Failed to update customer status: ${err.message}`);
        } finally {
            setUpdateInProgress(null);
        }
    };
    
    // 3. SEARCH & SORT LOGIC (Memoized for performance)
    const filteredAndSortedCustomers = useMemo(() => {
        const s = searchTerm.toLowerCase();
        
        // Filter based on search term (name, email, contactNo, customerId)
        const filtered = customers.filter((customer) => {
            return (
                (customer.name || "").toLowerCase().includes(s) ||
                (customer.email || "").toLowerCase().includes(s) ||
                (customer.contactNo || "").toLowerCase().includes(s) ||
                (customer.customerId || "").toLowerCase().includes(s)
            );
        });

        // Sort the filtered list
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


    // 4. UI HANDLERS & HELPERS

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleSortClick = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <ChevronDown className="w-4 h-4 opacity-50" />;
        return sortDirection === "asc" ? 
            <ChevronUp className="w-4 h-4 text-indigo-600" /> : 
            <ChevronDown className="w-4 h-4 text-indigo-600" />;
    };

    const getStatusBadge = (isBlocked) => {
        if (isBlocked) {
            return (
                <span className="inline-flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    <Ban className="w-3 h-3" /> Blocked
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Active
            </span>
        );
    };
    
    // 5. CSV EXPORT (Placeholder - assumes export logic will be passed or defined here)
    const exportToCSV = () => {
        // Implement the robust CSV generation logic here, using filteredAndSortedCustomers
        const headers = ["Customer ID", "Name", "Email", "Contact No", "Referral Code", "Status"];
        const csvData = filteredAndSortedCustomers.map(customer => [
            customer.customerId || "",
            customer.name || "",
            customer.email || "",
            customer.contactNo || "",
            customer.referralCode || "",
            customer.isBlocked ? "Blocked" : "Active" 
        ]);

        const csvContent = [
            headers.join(","),
            ...csvData.map(row => row.map(field => `"${field}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = "customer_directory.csv"; 
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto bg-white rounded-xl shadow-lg border border-gray-100">

                {/* --- HEADER & CONTROLS --- */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between">
                    
                    {/* Title Block */}
                    <div className="flex items-center mb-4 md:mb-0">
                        <Users className="w-6 h-6 text-indigo-600 mr-3" />
                        <h1 className="text-xl font-bold text-gray-900">
                            Customer Directory ({customers.length})
                        </h1>
                    </div>

                    {/* Search and Export Group */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                            />
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={exportToCSV} 
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors flex-shrink-0"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-300 text-red-800 rounded-b-xl flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* --- TABLE STRUCTURE --- */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-16 text-center">
                            <Loader className="w-10 h-10 animate-spin mx-auto text-indigo-500" />
                            <p className="mt-4 text-lg text-gray-600 font-medium">Loading customers...</p>
                        </div>
                    ) : filteredAndSortedCustomers.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">
                            <Users className="w-10 h-10 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No customers found matching your criteria.</p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[900px] table-auto">
                            <thead className="bg-gray-50 border-t border-gray-200">
                                <tr>
                                    {/* Table Headers */}
                                    {[
                                        { key: "name", label: "Customer Name", icon: Users },
                                        { key: "email", label: "Email", icon: Mail },
                                        { key: "contactNo", label: "Contact", icon: Phone },
                                        { key: "customerId", label: "Customer ID", icon: IdCard },
                                        { key: "referralCode", label: "Referral", icon: Gift },
                                        { key: "isBlocked", label: "Status", icon: CheckCircle }
                                    ].map(({ key, label, icon: Icon }) => (
                                        <th 
                                            key={key}
                                            className="p-4 text-left text-xs font-bold tracking-wider text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSortClick(key)}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <Icon className="w-4 h-4 text-indigo-500" />
                                                <span>{label}</span>
                                                <SortIcon field={key} />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="p-4 text-xs font-bold tracking-wider text-center text-gray-600 uppercase w-[120px]">ACTION</th> 
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                                {filteredAndSortedCustomers.map((customer) => (
                                    <tr 
                                        key={customer.id} 
                                        className={`hover:bg-indigo-50/20 transition-colors ${customer.isBlocked ? 'bg-red-50' : ''}`}
                                    >
                                        
                                        {/* Name */}
                                        <td className="p-4 font-medium text-gray-900">{customer.name || "N/A"}</td>

                                        {/* Email */}
                                        <td className="p-4 text-sm text-gray-600 truncate">{customer.email || "N/A"}</td>
                                        
                                        {/* Contact */}
                                        <td className="p-4 text-sm text-gray-600 whitespace-nowrap">{customer.contactNo || "N/A"}</td>

                                        {/* Customer ID */}
                                        <td className="p-4">
                                            <span className="bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-xs font-mono font-medium">
                                                {customer.customerId || "—"}
                                            </span>
                                        </td>

                                        {/* Referral Code */}
                                        <td className="p-4 text-sm text-gray-600">
                                            {customer.referralCode || "—"}
                                        </td>

                                        {/* Status */}
                                        <td className="p-4 text-center">
                                            {getStatusBadge(customer.isBlocked)}
                                        </td>
                                        
                                        {/* Action Button (Toggle Block) */}
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => toggleBlockStatus(customer.id, customer.isBlocked)}
                                                disabled={updateInProgress === customer.id}
                                                className={`w-full px-3 py-1.5 text-xs rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-1 ${
                                                    customer.isBlocked 
                                                        ? 'bg-blue-500 hover:bg-blue-600' 
                                                        : 'bg-red-500 hover:bg-red-600'
                                                } ${updateInProgress === customer.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {updateInProgress === customer.id ? (
                                                    <Loader className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    customer.isBlocked ? 'Unblock' : 'Block'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerDirectory;