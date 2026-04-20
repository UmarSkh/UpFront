import { useState, useEffect } from 'react';
import { User, Star, Shield, Award, Clock, Edit2, Check, X, Camera, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../config';

export default function Profile() {
  const [reviews, setReviews] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' or 'transactions'
  const [editName, setEditName] = useState('');
  const [editPicture, setEditPicture] = useState('');
  
  const userStr = localStorage.getItem('user');
  const [user, setUser] = useState(userStr ? JSON.parse(userStr) : null);

  useEffect(() => {
    if (user?.id) {
      fetchReviews();
      fetchTransactions();
      setEditName(user.name);
      setEditPicture(user.picture);
    }
  }, [user?.id]);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`${API_URL}/api/reviews/user/${user.id}`);
      if (res.ok) setReviews(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/transactions`, {
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) setTransactions(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id 
        },
        body: JSON.stringify({ name: editName, picture: editPicture })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const newUser = { ...user, name: updatedUser.name, picture: updatedUser.picture };
        setUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
        window.dispatchEvent(new Event('storage'));
        setIsEditing(false);
        toast.success('Profile updated!');
      }
    } catch (err) { toast.error('Update failed'); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditPicture(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'No ratings';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-full -z-0 opacity-50"></div>
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="relative">
            <img 
              src={isEditing ? editPicture || 'https://via.placeholder.com/120' : user?.picture || 'https://via.placeholder.com/120'} 
              className={`w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl transition-all ${isEditing ? 'brightness-75' : ''}`}
            />
            {isEditing && (
              <label className="absolute inset-0 rounded-3xl flex flex-col items-center justify-center cursor-pointer bg-purple-600/60 backdrop-blur-[2px] hover:bg-purple-600/80 transition-all text-white border-2 border-white/50">
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Upload New</span>
                <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
              </label>
            )}
            {!isEditing && (
               <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white shadow-sm" title="Online"></div>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Display Name</label>
                    <input 
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="text-2xl font-bold text-gray-900 border-b-2 border-purple-200 outline-none focus:border-purple-600 bg-gray-50/50 px-2 py-1 rounded-t-lg min-w-[250px]"
                      autoFocus
                    />
                  </div>
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">{user?.name}</h1>
                )}
                <p className="text-gray-500 mt-1">{user?.email}</p>
              </div>

              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleUpdateProfile} 
                    className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all"
                  >
                    <Check className="w-4 h-4" /> Save Changes
                  </button>
                  <button 
                    onClick={() => { setIsEditing(false); setEditName(user.name); setEditPicture(user.picture); }} 
                    className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-all"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              <div className="bg-gray-50 px-4 py-2 rounded-2xl flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-bold text-gray-800">{avgRating}</span>
                <span className="text-gray-400 text-xs">({reviews.length} reviews)</span>
              </div>
              <div className="bg-purple-50 px-4 py-2 rounded-2xl flex items-center gap-2 border border-purple-100">
                <Wallet className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-purple-700">{user?.credits} Moral Credits</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar Tabs */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-1">
             <h3 className="font-bold text-xs text-gray-400 uppercase tracking-widest px-2 mb-2">Activities</h3>
             <button 
               onClick={() => setActiveTab('reviews')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'reviews' ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
             >
               <Star className="w-4 h-4" /> Reviews
             </button>
             <button 
               onClick={() => setActiveTab('transactions')}
               className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all ${activeTab === 'transactions' ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-100' : 'text-gray-600 hover:bg-gray-50'}`}
             >
               <Wallet className="w-4 h-4" /> Transactions
             </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" /> Trust Badges
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Shield className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Verified Identity</p>
                  <p className="text-[10px] text-indigo-700">Email authenticated</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <Clock className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Early Adopter</p>
                  <p className="text-[10px] text-emerald-700">Joined in Phase 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-2">
           {activeTab === 'reviews' ? (
             <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-fade-in">
               <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                 What others say
               </h2>
               
               {loading ? (
                 <div className="space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-2xl" />)}
                 </div>
               ) : reviews.length === 0 ? (
                 <div className="text-center py-12">
                   <Star className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                   <p className="text-gray-400">No reviews yet.</p>
                 </div>
               ) : (
                 <div className="space-y-4">
                   {reviews.map((rev) => (
                     <div key={rev._id} className="p-5 bg-gray-50 rounded-2xl space-y-3 hover:bg-white hover:shadow-md hover:ring-1 hover:ring-purple-100 transition-all">
                       <div className="flex justify-between items-start">
                         <div className="flex items-center gap-3">
                           <img src={rev.reviewer?.picture || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                           <div>
                             <p className="text-sm font-bold text-gray-900">{rev.reviewer?.name}</p>
                             <p className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</p>
                           </div>
                         </div>
                         <div className="flex gap-1">
                           {[...Array(5)].map((_, i) => (
                             <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                           ))}
                         </div>
                       </div>
                       <p className="text-sm text-gray-600 leading-relaxed italic">"{rev.comment || 'No comment provided.'}"</p>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           ) : (
             <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm animate-fade-in">
               <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                 Credit History
               </h2>
               <div className="space-y-3">
                 {transactions.length === 0 ? (
                   <p className="text-center text-gray-400 py-8">No transactions yet.</p>
                 ) : (
                   transactions.map((t) => (
                     <div key={t._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-white hover:ring-1 hover:ring-gray-100 transition-all">
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl ${t.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                           {t.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                         </div>
                         <div className="flex-1">
                           <p className="text-sm font-bold text-gray-900">{t.description}</p>
                           <p className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                         </div>
                       </div>
                       <p className={`font-bold shrink-0 ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                         {t.amount > 0 ? '+' : ''}{t.amount}
                       </p>
                     </div>
                   ))
                 )}
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
