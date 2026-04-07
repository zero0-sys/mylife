import React from 'react';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export function SherlyAI() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center text-center space-y-6"
    >
      <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/50">
        <Bot size={48} className="text-blue-400" />
      </div>
      <div>
        <h2 className="text-3xl font-bold mb-2">Sherly AI</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          Fitur chat dengan Sherly AI sedang dalam tahap pengembangan (sedang di update). Nantikan kehadirannya segera!
        </p>
      </div>
    </motion.div>
  );
}
