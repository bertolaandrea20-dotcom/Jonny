"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Star, Menu, LogOut } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Booking {
  id: string;
  serviceTitle: string;
  provider: string;
  date: string;
  time: string;
  price: number;
  status: "upcoming" | "completed" | "cancelled";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");
  const [showMenu, setShowMenu] = useState(false);

  const upcomingBookings: Booking[] = [
    {
      id: "1",
      serviceTitle: "House Cleaning",
      provider: "John's Cleaning Service",
      date: "2026-04-15",
      time: "10:00 AM",
      price: 45,
      status: "upcoming",
    },
    {
      id: "2",
      serviceTitle: "Plumbing Repairs",
      provider: "Mike's Plumbing",
      date: "2026-04-18",
      time: "02:00 PM",
      price: 60,
      status: "upcoming",
    },
  ];

  const completedBookings: Booking[] = [
    {
      id: "3",
      serviceTitle: "Personal Training",
      provider: "Sarah's Fitness",
      date: "2026-03-20",
      time: "06:00 AM",
      price: 55,
      status: "completed",
    },
    {
      id: "4",
      serviceTitle: "Photography Services",
      provider: "Alex Photography",
      date: "2026-03-10",
      time: "11:00 AM",
      price: 120,
      status: "completed",
    },
  ];

  const bookings =
    activeTab === "upcoming" ? upcomingBookings : completedBookings;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    }
  };

  const stats = [
    { label: "Total Bookings", value: "8", icon: "📅" },
    { label: "Completed", value: "6", icon: "✅" },
    { label: "Spent", value: "$485", icon: "💰" },
    { label: "Rating", value: "4.8", icon: "⭐" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, Andrea!
              </p>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                New Booking
              </button>
              <button className="p-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700">
                <LogOut size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            <button
              className="md:hidden p-2 bg-gray-200 dark:bg-gray-800 rounded-lg"
              onClick={() => setShowMenu(!showMenu)}
            >
              <Menu size={24} />
            </button>
          </div>

          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="md:hidden mb-6 space-y-2"
            >
              <button className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                New Booking
              </button>
              <button className="w-full px-6 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg hover:bg-gray-300">
                Logout
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                </div>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bookings Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden"
        >
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "upcoming"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}>
              Upcoming Bookings ({upcomingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === "completed"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}>
              Completed Bookings ({completedBookings.length})
            </button>
          </div>

          {/* Bookings List */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {bookings.length > 0 ? (
              bookings.map((booking, index) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {booking.serviceTitle}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        by {booking.provider}
                      </p>

                      <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} />
                          <span>{booking.date}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock size={16} />
                          <span>{booking.time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          ${booking.price}
                        </p>
                      </div>

                      <span
                        className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </span>

                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        {activeTab === "upcoming" ? "Reschedule" : "Rebook"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No {activeTab} bookings found
                </p>
                <Link
                  href="/services"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Browse Services
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}