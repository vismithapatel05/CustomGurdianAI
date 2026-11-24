import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiZap, FiMenu, FiX } from 'react-icons/fi';

export default function Navbar({ currentPage, setCurrentPage }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <nav className="glass-navbar sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setCurrentPage('landing')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FiShield className="text-white text-lg" />
            </div>
            <div>
              <span className="font-bold text-white text-lg leading-none block">CustomsGuardian</span>
              <span className="text-xs text-blue-400 font-medium flex items-center gap-1">
                <FiZap className="text-xs" /> AI
              </span>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {['landing', 'dashboard'].map((page) => (
              <motion.button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentPage === page
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {page === 'landing' ? 'Home' : 'Dashboard'}
              </motion.button>
            ))}
            <motion.button
              onClick={() => setCurrentPage('dashboard')}
              className="ml-2 btn-primary text-sm py-2 px-5"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Validate Documents
            </motion.button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-slate-400 hover:text-white p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            id="mobile-menu-btn"
          >
            {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden pb-4 space-y-2"
          >
            {['landing', 'dashboard'].map((page) => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800"
              >
                {page === 'landing' ? 'Home' : 'Dashboard'}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </nav>
  );
}
