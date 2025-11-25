// EarningsPage.jsx
import React, { useState } from 'react';
import { FiDollarSign, FiCalendar, FiTrendingUp, FiAlertCircle, FiXCircle } from 'react-icons/fi';

// Dummy data for the summary cards
const summaryData = {
  earned: 0,
  upcoming: 0,
  cancelled: 0,
};

// Component for the summary cards
const SummaryCard = ({ title, amount, icon: Icon, bgColor, textColor }) => (
  <div className={`p-6 rounded-xl shadow-lg flex flex-col justify-between h-32 ${bgColor}`}>
    <div className="flex items-center justify-between">
      <h3 className={`text-sm font-semibold ${textColor}`}>{title}</h3>
      <Icon className={`w-6 h-6 ${textColor}`} />
    </div>
    <p className={`text-3xl font-bold ${textColor}`}>
      ₹{amount.toLocaleString('en-IN')}
    </p>
  </div>
);

export default function EarningsPage() {
  const [timePeriod, setTimePeriod] = useState('Monthly'); // Default to Monthly as seen in the image

  const timePeriods = ['Weekly', 'Monthly', 'Yearly'];

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Time Period Selector */}
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiDollarSign className="w-5 h-5 mr-2 text-purple-600" /> Earnings
          </h2>
          
          {/* Time Period Selector */}
          <div className="flex items-center p-1 bg-gray-100 rounded-lg">
            {timePeriods.map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-1 text-xs font-semibold rounded-md transition-colors duration-200
                  ${timePeriod === period 
                    ? 'bg-white shadow-md text-purple-700' 
                    : 'text-gray-600 hover:bg-gray-200'}
                `}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* --- 3 Summary Cards --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <SummaryCard
            title="EARNED"
            amount={summaryData.earned}
            icon={FiTrendingUp}
            bgColor="bg-green-50/70 border border-green-200"
            textColor="text-green-700"
          />
          <SummaryCard
            title="UPCOMING"
            amount={summaryData.upcoming}
            icon={FiAlertCircle}
            bgColor="bg-blue-50/70 border border-blue-200"
            textColor="text-blue-700"
          />
          <SummaryCard
            title="CANCELLED"
            amount={summaryData.cancelled}
            icon={FiXCircle}
            bgColor="bg-red-50/70 border border-red-200"
            textColor="text-red-700"
          />
        </div>

        {/* --- Breakdown Section --- */}
        <div className="mt-8">
          <div className="flex items-center pb-4">
            <FiCalendar className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-800">Breakdown</h3>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 min-h-[200px] flex items-center justify-center">
            <p className="text-gray-500 italic">
              No earnings data found for selected range.
            </p>
            <p className="text-gray-500 italic ml-2">Loading...</p> 
          </div>
        </div>
        
      </div>
    </div>
  );
}