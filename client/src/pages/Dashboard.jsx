import { useState, useEffect } from 'react';
import { MapPin, ArrowRight, CheckCircle2, Clock, Coins } from 'lucide-react';
import { io } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';

export default function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [myActiveTasks, setMyActiveTasks] = useState([]);
  const [filter, setFilter] = useState('All Types');

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    fetchTasks();
    fetchMyTasks();

    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => console.log('Dashboard Socket Connected:', socket.id));
    socket.on('connect_error', (err) => console.error('Dashboard Socket Error:', err));

    socket.on('taskCreated', (newTask) => {
      if (!currentUser || newTask.creator._id !== currentUser.id) {
        setTasks(prev => [newTask, ...prev]);
        toast('New task available!', { icon: '✨' });
      } else {
        setMyActiveTasks(prev => [newTask, ...prev]);
      }
    });

    socket.on('taskAccepted', (taskId) => {
      setTasks(prev => prev.filter(t => t._id !== taskId));
    });

    return () => socket.disconnect();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tasks`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (res.ok) setTasks(await res.json());
    } catch (err) { console.error('Failed to fetch tasks', err); }
  };

  const fetchMyTasks = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/tasks/me/all`, {
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        const { created, running } = await res.json();
        const active = [...created, ...running].filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
        setMyActiveTasks(active);
      }
    } catch (err) { console.error(err); }
  };

  const handleAcceptTask = async (e, taskId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) return navigate('/login');

    try {
      const res = await fetch(`${API_URL}/api/tasks/${taskId}/accept`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        toast.success('Task accepted! Go to the task page to chat.');
        navigate(`/task/${taskId}`);
      } else {
        const d = await res.json();
        toast.error(d.message);
      }
    } catch (err) {
      toast.error('Failed to accept task');
    }
  };

  const filteredTasks = tasks.filter(t => filter === 'All Types' || t.type === filter);

  const STATUS_COLORS = {
    'Searching': 'bg-amber-100 text-amber-700',
    'Matched': 'bg-blue-100 text-blue-700',
    'In Progress': 'bg-indigo-100 text-indigo-700',
    'Proof': 'bg-purple-100 text-purple-700',
    'Completed': 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-10 animate-fade-in">

      {/* My Active Tasks */}
      {myActiveTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">⚡ My Active Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myActiveTasks.map(task => (
              <Link to={`/task/${task._id}`} key={task._id} className="block bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-5 border border-purple-100 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300 group">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'}`}>
                    {task.status}
                  </span>
                  <div className="flex items-center gap-1 text-purple-600 font-bold text-sm">
                    <Coins className="w-3.5 h-3.5" />{task.credits} MC
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors line-clamp-2 mb-2">{task.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{task.source}{task.destination && ` → ${task.destination}`}</span>
                </div>
                <p className="text-xs text-purple-600 font-medium mt-3">Tap to view →</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Available Tasks */}
      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Available Tasks</h2>
            <p className="text-gray-500 mt-1 text-sm">Help your peers and earn Moral Credits.</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 p-2.5 outline-none"
          >
            <option>All Types</option>
            <option>Delivery</option>
            <option>Info</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No tasks available right now.<br />Be the first to create one!</p>
            </div>
          ) : filteredTasks.map(task => (
            <Link to={`/task/${task._id}`} key={task._id} className="block bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(170,59,255,0.1)] transition-all duration-300 group">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${task.type === 'Delivery' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {task.type}
                </span>
                <div className="flex items-center gap-1 font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md text-sm">
                  <Coins className="w-3.5 h-3.5" />{task.credits} MC
                </div>
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight group-hover:text-purple-600 transition-colors">
                {task.title}
              </h3>
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{task.source}{task.destination && <> <ArrowRight className="inline w-3 h-3 mx-0.5" /> {task.destination}</>}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{task.status}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                  <img src={task.creator?.picture || 'https://via.placeholder.com/24'} alt="" className="w-5 h-5 rounded-full" />
                  <span>{task.creator?.name || 'Anonymous'}</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-gray-50">
                <button 
                  onClick={(e) => handleAcceptTask(e, task._id)}
                  className="w-full flex items-center justify-center gap-2 bg-gray-50 group-hover:bg-purple-600 group-hover:text-white text-gray-600 font-medium py-2.5 rounded-xl transition-all duration-300 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Task
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
