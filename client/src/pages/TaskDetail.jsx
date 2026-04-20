import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapPin, ArrowRight, Send, Upload, CheckCircle2, ArrowLeft, Clock, User, Home, Eye, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const STATUS_STEPS = ['Searching', 'Matched', 'In Progress', 'Proof', 'Completed'];
const STATUS_COLORS = {
  'Searching': 'bg-amber-100 text-amber-700',
  'Matched': 'bg-blue-100 text-blue-700',
  'In Progress': 'bg-indigo-100 text-indigo-700',
  'Proof': 'bg-purple-100 text-purple-700',
  'Completed': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700',
};

export default function TaskDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const [task, setTask] = useState(null);
  const [messages, setMessages] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null); // For lightbox
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTask();
    fetchMessages();
    fetchProofs();

    const s = io('http://localhost:5000');
    s.emit('joinRoom', id);
    s.on('newMessage', (msg) => setMessages(prev => [...prev, msg]));
    s.on('statusUpdated', ({ status }) => {
      fetchTask();
      if (status === 'Proof') fetchProofs();
    });
    setSocket(s);

    return () => {
      s.emit('leaveRoom', id);
      s.disconnect();
    };
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTask = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (res.ok) setTask(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${id}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (res.ok) setMessages(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchProofs = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}/proofs`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      });
      if (res.ok) setProofs(await res.json());
    } catch (err) { console.error(err); }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('sendMessage', { taskId: id, senderId: currentUser?.id, content: input.trim() });
    setInput('');
  };

  const updateStatus = async (status) => {
    if (status === 'Cancelled' && !window.confirm('Are you sure you want to cancel this task? Your credits will be refunded.')) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUser?.id },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        toast.success(status === 'Cancelled' ? 'Task cancelled' : `Task status: ${status}`);
        if (status === 'Completed' || status === 'Cancelled') {
           // Credits might have changed, but local storage doesn't know. 
           // In a real app we'd refresh the whole user object.
        }
      } else {
        const d = await res.json();
        toast.error(d.message);
      }
    } catch (err) { toast.error('Failed to update status'); }
  };

  const handleAcceptTask = async () => {
    if (!currentUser) return navigate('/login');
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}/accept`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser.id }
      });
      if (res.ok) {
        toast.success('Task accepted!');
        fetchTask();
      } else {
        const d = await res.json();
        toast.error(d.message);
      }
    } catch (err) { toast.error('Failed to accept task'); }
  };

  const uploadProof = async (type) => {
    if (!proofFile) return toast.error('Select a file first');
    setUploading(true);
    const formData = new FormData();
    formData.append('proof', proofFile);
    formData.append('type', type);
    try {
      const res = await fetch(`http://localhost:5000/api/tasks/${id}/proof`, {
        method: 'POST',
        headers: { 'x-user-id': currentUser?.id },
        body: formData
      });
      if (res.ok) {
        toast.success('Proof uploaded successfully!');
        setProofFile(null);
        fetchTask();
        fetchProofs();
      } else {
        const d = await res.json();
        toast.error(d.message);
      }
    } catch (err) { toast.error('Upload failed'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading task...</div>;
  if (!task) return <div className="flex items-center justify-center h-64 text-red-500">Task not found.</div>;

  const getUserId = (userObj) => {
    if (!userObj) return null;
    return typeof userObj === 'string' ? userObj : (userObj._id || userObj.id);
  };

  const isCreator = getUserId(task.creator) === currentUser?.id;
  const isRunner = task.runner && getUserId(task.runner) === currentUser?.id;
  const currentStep = STATUS_STEPS.indexOf(task.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition-colors text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Task Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
        {task.status === 'Cancelled' && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
             <div className="bg-red-100 text-red-700 px-6 py-2 rounded-full font-bold shadow-lg border border-red-200">CANCELLED</div>
          </div>
        )}
        
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <p className="text-gray-500 mt-1">{task.description}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'}`}>
            {task.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" />{task.source}</span>
          {task.destination && <span className="flex items-center gap-1.5"><ArrowRight className="w-4 h-4 text-gray-400" />{task.destination}</span>}
          <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-gray-400" />By {task.creator?.name || 'User'}</span>
          <span className="font-semibold text-purple-600">{task.credits} MC</span>
        </div>

        {/* Progress stepper */}
        <div className="mt-6">
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                   task.status === 'Cancelled' ? 'bg-gray-200 text-gray-400' :
                   i < currentStep ? 'bg-purple-600 text-white' :
                   i === currentStep ? 'bg-purple-600 text-white ring-4 ring-purple-100' :
                   'bg-gray-100 text-gray-400'
                }`}>
                  {i < currentStep && task.status !== 'Cancelled' ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded transition-all ${i < currentStep && task.status !== 'Cancelled' ? 'bg-purple-600' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ height: '420px' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Chat</h2>
            {(task.status === 'Completed' || task.status === 'Cancelled') && (
               <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors">
                <Home className="w-3.5 h-3.5" /> Home
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && <p className="text-center text-gray-400 text-sm mt-8">No messages yet. Start the conversation!</p>}
            {messages.map((msg, i) => {
              const isMine = getUserId(msg.sender) === currentUser?.id;
              return (
                <div key={i} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {!isMine && <img src={msg.sender?.picture || 'https://via.placeholder.com/32'} className="w-7 h-7 rounded-full object-cover mt-1 shrink-0" />}
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${isMine ? 'bg-purple-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          {task.status !== 'Completed' && task.status !== 'Cancelled' && (
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none text-sm bg-gray-50 focus:bg-white"
              />
              <button type="submit" className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Actions Panel */}
        <div className="space-y-4">
          {/* Participants */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
            <h3 className="font-semibold text-gray-800">Participants</h3>
            <div className="flex items-center gap-3">
              <img src={task.creator?.picture || 'https://via.placeholder.com/36'} className="w-9 h-9 rounded-full" />
              <div>
                <p className="text-sm font-medium text-gray-800">{task.creator?.name}</p>
                <p className="text-xs text-gray-400">Creator</p>
              </div>
            </div>
            {task.runner && (
              <div className="flex items-center gap-3">
                <img src={task.runner?.picture || 'https://via.placeholder.com/36'} className="w-9 h-9 rounded-full" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{task.runner?.name}</p>
                  <p className="text-xs text-gray-400">Runner</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {task.status === 'Searching' && !isCreator && (
            <button onClick={handleAcceptTask} className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center justify-center gap-2 animate-pulse hover:animate-none">
              <CheckCircle2 className="w-5 h-5" /> Accept This Task
            </button>
          )}

          {task.status === 'Searching' && isCreator && (
            <button onClick={() => updateStatus('Cancelled')} className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100">
              <XCircle className="w-4 h-4" /> Cancel Task
            </button>
          )}

          {isRunner && task.status === 'Matched' && (
            <button onClick={() => updateStatus('In Progress')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
              <Clock className="w-4 h-4" /> Start Task
            </button>
          )}

          {isRunner && (task.status === 'In Progress' || task.status === 'Proof') && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-800">Submit Proof</h3>
              <div className="space-y-2">
                <input 
                  type="file" 
                  id="proof-upload"
                  accept="image/*,video/*" 
                  onChange={e => {
                    const file = e.target.files[0];
                    console.log('File selected:', file);
                    setProofFile(file);
                  }} 
                  className="hidden" 
                />
                <label 
                  htmlFor="proof-upload"
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-purple-300 transition-all text-sm font-medium text-gray-600"
                >
                  <Upload className="w-4 h-4 text-purple-500" />
                  {proofFile ? 'Change File' : 'Choose File (Image/Video)'}
                </label>
                
                {proofFile && (
                  <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                    <span className="text-xs text-purple-700 font-medium truncate flex-1 mr-2">
                      {proofFile.name}
                    </span>
                    <button onClick={() => setProofFile(null)} className="p-1 hover:bg-purple-100 rounded text-purple-600">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => uploadProof('completion')} 
                disabled={uploading || !proofFile} 
                className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload & Submit'}
              </button>
            </div>
          )}

          {/* Proofs Display */}
          {proofs.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" /> Task Proofs
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {proofs.map((p) => (
                  <button 
                    key={p._id} 
                    onClick={() => setSelectedProof(p)}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-gray-100 hover:ring-2 hover:ring-purple-400 transition-all"
                  >
                    <img 
                      src={`data:${p.mimeType};base64,${p.data}`} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCreator && (task.status === 'Proof' || task.status === 'In Progress') && (
            <div className="space-y-2">
              <button onClick={() => updateStatus('Completed')} className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100">
                <CheckCircle2 className="w-4 h-4" /> Confirm & Complete
              </button>
            </div>
          )}

          {task.status === 'Completed' && (
            <ReviewSection task={task} currentUser={currentUser} />
          )}
      </div>
    </div>

      {/* Lightbox */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200" onClick={() => setSelectedProof(null)}>
          <button className="absolute top-6 right-6 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all">
            <XCircle className="w-8 h-8" />
          </button>
          <div className="max-w-full max-h-full overflow-auto rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <img 
              src={`data:${selectedProof.mimeType};base64,${selectedProof.data}`} 
              className="max-w-full h-auto max-h-[85vh] rounded-lg shadow-2xl border-4 border-white/10" 
              alt="Proof"
            />
            <div className="mt-4 flex items-center justify-between px-2 text-white">
              <div>
                <p className="text-sm font-bold">{selectedProof.uploader?.name}</p>
                <p className="text-xs text-white/50">{new Date(selectedProof.createdAt).toLocaleString()}</p>
              </div>
              <a 
                href={`data:${selectedProof.mimeType};base64,${selectedProof.data}`} 
                download={`proof-${selectedProof._id}`}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-all"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewSection({ task, currentUser }) {
  const navigate = useNavigate();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const getUserId = (userObj) => {
    if (!userObj) return null;
    return typeof userObj === 'string' ? userObj : (userObj._id || userObj.id);
  };

  const isCreator = getUserId(task.creator) === currentUser?.id;
  const reviewee = isCreator ? task.runner : task.creator;
  const revieweeId = getUserId(reviewee);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!revieweeId) return toast.error('Reviewee information missing. Please refresh.');
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          taskId: task._id,
          revieweeId: revieweeId,
          rating,
          comment
        })
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('Review submitted!');
      } else {
        const d = await res.json();
        toast.error(d.message);
      }
    } catch (err) {
      toast.error('Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center animate-fade-in space-y-4">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
        <h3 className="font-bold text-green-900">Thank you!</h3>
        <p className="text-sm text-green-700">Your review has been submitted.</p>
        <button onClick={() => navigate('/')} className="w-full py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2">
          <Home className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-fade-in">
      <h3 className="font-bold text-gray-900 mb-1">Rate your experience</h3>
      <p className="text-sm text-gray-500 mb-4">How was working with {reviewee?.name || 'them'}?</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                rating >= star ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              ★
            </button>
          ))}
        </div>
        
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a short comment (optional)..."
          className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm h-24 resize-none"
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
        <button type="button" onClick={() => navigate('/')} className="w-full py-2 text-gray-500 text-xs hover:text-purple-600">
          Skip for now
        </button>
      </form>
    </div>
  );
}
