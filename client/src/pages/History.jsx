import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Clock, CheckCircle2, Coins, Search } from 'lucide-react';

const STATUS_COLORS = {
  'Searching': 'bg-amber-100 text-amber-700',
  'Matched': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Proof': 'bg-purple-100 text-purple-700',
  'Completed': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

function TaskCard({ task, role }) {
  return (
    <Link to={`/task/${task._id}`} className="block bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgba(170,59,255,0.1)] hover:border-purple-100 transition-all duration-300 group">
      <div className="flex justify-between items-start mb-3">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status]}`}>{task.status}</span>
        <div className="flex items-center gap-1 text-purple-600 font-bold text-sm bg-purple-50 px-2 py-1 rounded-md">
          <Coins className="w-3.5 h-3.5" />
          {task.credits} MC
        </div>
      </div>
      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors mb-2 line-clamp-2">{task.title}</h3>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span>{task.source}{task.destination && ` → ${task.destination}`}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
        {role === 'creator' ? 'You created this task' : 'You are running this task'}
      </div>
    </Link>
  );
}

export default function History() {
  const [createdTasks, setCreatedTasks] = useState([]);
  const [runningTasks, setRunningTasks] = useState([]);
  const [tab, setTab] = useState('created');
  const [subTab, setSubTab] = useState('active'); // 'active' or 'completed'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return setLoading(false);

      try {
        const res = await fetch('http://localhost:5000/api/tasks/me/all', {
          headers: { 'x-user-id': user.id }
        });
        if (res.ok) {
          const { created, running } = await res.json();
          setCreatedTasks(created);
          setRunningTasks(running);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchHistory();
  }, []);

  const currentList = tab === 'created' ? createdTasks : runningTasks;
  const activeTasks = currentList.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const completedTasks = currentList.filter(t => t.status === 'Completed' || t.status === 'Cancelled');
  
  const displayTasks = subTab === 'active' ? activeTasks : completedTasks;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Task History</h1>
        <p className="text-gray-500 mt-1">Track all your tasks and credits.</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Tasks', value: createdTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Running', value: runningTasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Completed', value: createdTasks.concat(runningTasks).filter(t => t.status === 'Completed').length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Credits Earned', value: runningTasks.filter(t => t.status === 'Completed').reduce((acc, t) => acc + t.credits, 0), color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center border border-transparent hover:border-white shadow-sm transition-all`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-sm text-gray-600 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Primary Tabs */}
      <div className="flex border-b border-gray-200 mt-8">
        {['created', 'running'].map(t => (
          <button key={t} onClick={() => { setTab(t); setSubTab('active'); }} className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t === 'created' ? `Tasks I Created (${createdTasks.filter(item => subTab === 'active' ? (item.status !== 'Completed' && item.status !== 'Cancelled') : (item.status === 'Completed' || item.status === 'Cancelled')).length})` : `Tasks I Accepted (${runningTasks.filter(item => subTab === 'active' ? (item.status !== 'Completed' && item.status !== 'Cancelled') : (item.status === 'Completed' || item.status === 'Cancelled')).length})`}
          </button>
        ))}
      </div>

      {/* Secondary Sub-Tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setSubTab('active')} 
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${subTab === 'active' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Active ({activeTasks.length})
        </button>
        <button 
          onClick={() => setSubTab('completed')} 
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${subTab === 'completed' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          Past / Completed ({completedTasks.length})
        </button>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Clock className="w-8 h-8 animate-spin opacity-20" />
          <p className="text-sm">Fetching your history...</p>
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-20 text-center">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Search className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">No tasks found in this section.</p>
          <p className="text-gray-400 text-sm mt-1">Try creating a task or accepting one from the dashboard!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTasks.map(task => (
            <TaskCard key={task._id} task={task} role={tab === 'created' ? 'creator' : 'runner'} />
          ))}
        </div>
      )}
    </div>
  );
}
