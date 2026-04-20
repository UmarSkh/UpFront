import { useState } from 'react';
import { Send, MapPin, Navigation, Type, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';

export default function CreateTask() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Delivery',
    source: '',
    destination: '',
    credits: 10
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) {
        alert('Please login first');
        return navigate('/login');
      }

      const res = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Task Created Successfully!');
        
        // Update user credits in local storage temporarily
        const updatedUser = { ...user, credits: user.credits - formData.credits };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Dispatch custom event to trigger navbar update
        window.dispatchEvent(new Event('storage'));
        
        navigate('/');
      } else {
        const data = await res.json();
        alert(`Failed: ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up mt-8">
      <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 relative overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-bl-full -z-0 opacity-50"></div>
        
        <div className="relative z-10 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create a Task</h1>
          <p className="text-gray-500 mt-2">Need a favor? Offer some Moral Credits and get it done by a peer.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Task Type</label>
              <div className="flex gap-4">
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${formData.type === 'Delivery' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <input type="radio" name="type" value="Delivery" className="hidden" checked={formData.type === 'Delivery'} onChange={handleChange} />
                  <Navigation className={`w-6 h-6 ${formData.type === 'Delivery' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${formData.type === 'Delivery' ? 'text-purple-700' : 'text-gray-600'}`}>Delivery</span>
                </label>
                <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${formData.type === 'Info' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                  <input type="radio" name="type" value="Info" className="hidden" checked={formData.type === 'Info'} onChange={handleChange} />
                  <Type className={`w-6 h-6 ${formData.type === 'Info' ? 'text-purple-600' : 'text-gray-400'}`} />
                  <span className={`font-medium ${formData.type === 'Info' ? 'text-purple-700' : 'text-gray-600'}`}>Information</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title</label>
              <input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Bring my book from Central Library" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Source Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input required type="text" name="source" value={formData.source} onChange={handleChange} placeholder="e.g. Central Library" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white" />
                </div>
              </div>
              {formData.type === 'Delivery' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input required type="text" name="destination" value={formData.destination} onChange={handleChange} placeholder="e.g. Jasper Hostel" className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Details / Description</label>
              <textarea required name="description" value={formData.description} onChange={handleChange} rows="3" placeholder="Provide more details to help the runner..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white resize-none"></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Moral Credits Offered</label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                <input required type="number" min="5" name="credits" value={formData.credits} onChange={handleChange} className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-gray-50 focus:bg-white font-semibold text-purple-700" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Minimum 5 credits for Info tasks. Delivery tasks scale with distance.</p>
            </div>
          </div>

          <button type="submit" className="w-full mt-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2 group">
            <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
            Publish Task
          </button>
        </form>
      </div>
    </div>
  );
}
