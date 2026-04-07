import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { formatCurrency, formatTime } from '../lib/utils';
import { TrendingUp, TrendingDown, Timer, Star, AlertCircle, CloudSun, CalendarDays, Heart, Coins, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

const quotes = [
  "Setiap langkah kecil adalah kemajuan.",
  "Disiplin adalah jembatan antara tujuan dan pencapaian.",
  "Hari ini adalah kesempatan untuk membangun hari esok yang kamu inginkan.",
  "Jangan menunggu sempurna untuk mulai, mulailah untuk menjadi sempurna.",
  "Waktu yang kamu gunakan untuk belajar tidak akan pernah sia-sia."
];

export function Dashboard() {
  const { user } = useStore();
  const [quote, setQuote] = useState('');
  const [stats, setStats] = useState({
    income: 0,
    expense: 0,
    studyTime: 0,
    strengthPoints: 0,
    weaknessPoints: 0
  });

  const [financeChartData, setFinanceChartData] = useState<any[]>([]);
  const [days360ChartData, setDays360ChartData] = useState<any[]>([]);
  const [weatherData, setWeatherData] = useState<any[]>([]);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [currentBtcPrice, setCurrentBtcPrice] = useState<number | null>(null);
  const [btcChange, setBtcChange] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getWeatherDescription = (code: number) => {
    const descriptions: Record<number, string> = {
      0: 'Langit Cerah',
      1: 'Cerah Berawan',
      2: 'Berawan',
      3: 'Mendung',
      45: 'Berkabut',
      48: 'Kabut Rime',
      51: 'Gerimis Ringan',
      53: 'Gerimis Sedang',
      55: 'Gerimis Lebat',
      61: 'Hujan Ringan',
      63: 'Hujan Sedang',
      65: 'Hujan Lebat',
      80: 'Hujan Shower Ringan',
      81: 'Hujan Shower Sedang',
      82: 'Hujan Shower Lebat',
      95: 'Badai Petir',
    };
    return descriptions[code] || 'Cuaca Tidak Diketahui';
  };

  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  useEffect(() => {
    // Fetch Weather Data
    const fetchWeather = async (lat: number = -6.2088, lon: number = 106.8456) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&current_weather=true&timezone=auto&forecast_days=1`);
        const data = await res.json();
        
        if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
          const hourly = data.hourly;
          const formattedWeather = hourly.time.map((timeStr: string, index: number) => {
            const date = new Date(timeStr);
            return {
              time: format(date, 'HH:mm'),
              temp: hourly.temperature_2m[index]
            };
          }).filter((_: any, i: number) => i % 3 === 0);

          setWeatherData(formattedWeather);
        }
        
        if (data.current_weather) {
          setCurrentWeather(data.current_weather);
        }
      } catch (error) {
        console.error("Failed to fetch weather", error);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(); // Fallback to Jakarta
        }
      );
    } else {
      fetchWeather();
    }

    // Fetch Crypto Data (Bitcoin)
    const fetchCrypto = async () => {
      try {
        // Using CoinGecko for price and Binance for historical trend (simulated with random walk for demo if API fails, but let's try a real one)
        // For real-time trend, we'll use CoinGecko's sparkline data
        const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=true');
        const data = await res.json();
        
        if (data.market_data) {
          setCurrentBtcPrice(data.market_data.current_price.usd);
          setBtcChange(data.market_data.price_change_percentage_24h);
          
          const sparkline = data.market_data.sparkline_7d.price;
          // Take last 24 points (roughly 24 hours if data is hourly)
          const trend = sparkline.slice(-24).map((price: number, index: number) => ({
            time: `${index}h`,
            price: price
          }));
          setCryptoData(trend);
        }
      } catch (error) {
        console.error("Failed to fetch crypto data", error);
      }
    };

    fetchCrypto();
    const cryptoInterval = setInterval(fetchCrypto, 60000); // Refresh every minute

    return () => clearInterval(cryptoInterval);
  }, []);

  useEffect(() => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = subDays(today, 6);

    // Finances Listener
    const qFinances = query(collection(db, 'finances'), where('userId', '==', user.uid));
    const unsubFinances = onSnapshot(qFinances, (snap) => {
      let income = 0;
      let expense = 0;
      
      // For chart
      const dailyData: Record<string, { income: number, expense: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        dailyData[format(d, 'yyyy-MM-dd')] = { income: 0, expense: 0 };
      }

      snap.forEach(doc => {
        const data = doc.data();
        if (!data.date) return;
        const docDate = new Date(data.date);
        if (isNaN(docDate.getTime())) return;
        
        // Today's stats
        if (docDate >= today) {
          if (data.type === 'income') income += data.amount;
          if (data.type === 'expense') expense += data.amount;
        }

        // Chart stats (last 7 days)
        const dateStr = typeof data.date === 'string' ? data.date.split('T')[0] : '';
        if (dateStr && dailyData[dateStr]) {
          if (data.type === 'income') dailyData[dateStr].income += data.amount;
          if (data.type === 'expense') dailyData[dateStr].expense += data.amount;
        }
      });
      
      setStats(s => ({ ...s, income, expense }));
      
      const chartData = Object.keys(dailyData).map(date => ({
        date: format(new Date(date), 'dd MMM', { locale: id }),
        Pemasukan: dailyData[date].income,
        Pengeluaran: dailyData[date].expense
      }));
      setFinanceChartData(chartData);
    });

    // Study Listener
    const qStudy = query(collection(db, 'study_sessions'), where('userId', '==', user.uid));
    const unsubStudy = onSnapshot(qStudy, (snap) => {
      let studyTime = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (!data.startTime) return;
        const docDate = new Date(data.startTime);
        if (isNaN(docDate.getTime())) return;
        if (docDate >= today) {
          studyTime += data.duration || 0;
        }
      });
      setStats(s => ({ ...s, studyTime }));
    });

    // Character Listener
    const qChar = query(collection(db, 'character_logs'), where('userId', '==', user.uid));
    const unsubChar = onSnapshot(qChar, (snap) => {
      let strengthPoints = 0;
      let weaknessPoints = 0;
      snap.forEach(doc => {
        const data = doc.data();
        if (data.type === 'strength') strengthPoints += data.points;
        if (data.type === 'weakness') weaknessPoints += data.points;
      });
      setStats(s => ({ ...s, strengthPoints, weaknessPoints }));
    });

    // Days 360 Listener
    const qDays = query(collection(db, 'project_days'), where('userId', '==', user.uid));
    const unsubDays = onSnapshot(qDays, (snap) => {
      const dailyData: Record<string, { active: number, skipped: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = subDays(today, i);
        dailyData[format(d, 'yyyy-MM-dd')] = { active: 0, skipped: 0 };
      }

      snap.forEach(doc => {
        const data = doc.data();
        if (!data.date) return;
        const dateStr = typeof data.date === 'string' ? data.date.split('T')[0] : '';
        if (dateStr && dailyData[dateStr]) {
          if (data.status === 'active') dailyData[dateStr].active += 1;
          if (data.status === 'skipped') dailyData[dateStr].skipped += 1;
        }
      });

      const chartData = Object.keys(dailyData).map(date => ({
        date: format(new Date(date), 'dd MMM', { locale: id }),
        Aktif: dailyData[date].active,
        Lewati: dailyData[date].skipped
      }));
      setDays360ChartData(chartData);
    });

    return () => {
      unsubFinances();
      unsubStudy();
      unsubChar();
      unsubDays();
    };
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
        <h2 className="text-2xl font-bold mb-2">Halo, {user?.displayName?.split(' ')[0]}! 👋</h2>
        <p className="text-slate-300 italic">"{quote}"</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Finance Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" /> Keuangan Hari Ini
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Pendapatan</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.income)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Pengeluaran</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(stats.expense)}</p>
            </div>
          </div>
        </div>

        {/* Study Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Timer size={20} className="text-blue-400" /> Belajar Hari Ini
          </h3>
          <div className="flex items-center justify-center h-24">
            <p className="text-4xl font-mono font-bold text-blue-400">{formatTime(stats.studyTime)}</p>
          </div>
        </div>

        {/* Character Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Star size={20} className="text-amber-400" /> Poin Karakter (Total)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <Star size={16} className="text-emerald-400" /> Kelebihan
              </span>
              <span className="text-xl font-bold text-emerald-400">{stats.strengthPoints}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400" /> Kekurangan
              </span>
              <span className="text-xl font-bold text-red-400">{stats.weaknessPoints}</span>
            </div>
          </div>
        </div>

        {/* Weather Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-4 flex items-center gap-2">
            <CloudSun size={20} className="text-yellow-400" /> Cuaca Saat Ini
          </h3>
          {currentWeather ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-white">{currentWeather.temperature}°C</p>
                <p className="text-sm text-slate-400 mt-1">{getWeatherDescription(currentWeather.weathercode)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Angin: {currentWeather.windspeed} km/h</p>
                <p className="text-xs text-slate-500">Arah: {currentWeather.winddirection}°</p>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex space-x-4 h-16 items-center">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
              </div>
            </div>
          )}
        </div>

        {/* Crypto Trend Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl overflow-hidden relative">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-medium text-slate-300 flex items-center gap-2">
              <Coins size={20} className="text-orange-400" /> Tren Bitcoin (BTC)
            </h3>
            {btcChange !== null && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${btcChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {btcChange >= 0 ? '+' : ''}{btcChange.toFixed(2)}%
              </span>
            )}
          </div>
          
          <div className="mb-2">
            {currentBtcPrice ? (
              <p className="text-2xl font-bold text-white">${currentBtcPrice.toLocaleString()}</p>
            ) : (
              <div className="h-8 w-32 bg-white/10 animate-pulse rounded"></div>
            )}
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Live Price • USD</p>
          </div>

          <div className="h-20 -mx-6 -mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cryptoData}>
                <defs>
                  <linearGradient id="colorCrypto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={btcChange && btcChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={btcChange && btcChange >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke={btcChange && btcChange >= 0 ? "#10b981" : "#ef4444"} 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorCrypto)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Clock & Day Progress Card */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-medium text-slate-300 flex items-center gap-2">
              <Clock size={20} className="text-blue-400" /> Waktu Sekarang
            </h3>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
              {format(currentTime, 'zzzz')}
            </span>
          </div>

          <div className="text-center py-2">
            <p className="text-5xl font-mono font-bold text-white tracking-tighter">
              {format(currentTime, 'HH:mm:ss')}
            </p>
            <p className="text-sm text-slate-400 mt-1">
              {format(currentTime, 'EEEE, dd MMMM yyyy', { locale: id })}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
              <span>Progres Hari Ini</span>
              <span>{Math.floor(((currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds()) / 86400) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentTime.getHours() * 3600 + currentTime.getMinutes() * 60 + currentTime.getSeconds()) / 86400) * 100}%` }}
                transition={{ type: "spring", bounce: 0, duration: 1 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finance Chart */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-400" /> Identifikasi Keuangan (7 Hari)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rp${value/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="Pemasukan" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Pengeluaran" stroke="#f87171" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Days 360 Chart */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <h3 className="text-lg font-medium text-slate-300 mb-6 flex items-center gap-2">
            <CalendarDays size={20} className="text-blue-400" /> Aktivitas Days 360 (7 Hari)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days360ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  cursor={{ fill: '#ffffff10' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Aktif" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lewati" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weather Chart */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl lg:col-span-2">
          <h3 className="text-lg font-medium text-slate-300 mb-6 flex items-center gap-2">
            <CloudSun size={20} className="text-yellow-400" /> Prakiraan Cuaca Hari Ini (Suhu °C)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weatherData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fbbf24' }}
                  formatter={(value: number) => [`${value}°C`, 'Suhu']}
                />
                <Area type="monotone" dataKey="temp" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
