const { useState, useEffect } = React;

// Forced to port 5001 to match the backend perfectly
const API_URL = 'http://127.0.0.1:5001/api';

// --- Navbar Component ---
const Navbar = ({ currentUser, onLoginClick, onLogout }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'}`}>
      <div className="container mx-auto px-6 max-w-6xl flex justify-between items-center">
        
        {/* Logo Text Only (Image Removed) */}
        <div className="flex flex-col">
          <div className={`text-2xl font-black tracking-tight transition-colors duration-300 leading-none ${scrolled ? 'text-gray-900' : 'text-white drop-shadow-md'}`}>
            Rural Job
          </div>
          <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${scrolled ? 'text-brand' : 'text-green-300 drop-shadow-md'}`}>
            Operations
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!currentUser ? (
            <button onClick={onLoginClick} className="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg hover:scale-105">
              Login / Register
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className={`hidden md:block font-bold ${scrolled ? 'text-gray-800' : 'text-white drop-shadow-sm'}`}>
                Hi, {currentUser.name} {currentUser.isVerified && '✅'}
              </span>
              <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// --- Auth Modal Component ---
const AuthModal = ({ isOpen, onClose, onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Worker');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Twilio Signup OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingUserData, setPendingUserData] = useState(null);

  // Forgot Password States
  const [isForgotPass, setIsForgotPass] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setFormError(''); setFormSuccess('');
    if (val !== '' && !/^\d+$/.test(val)) return setPhoneError("Numbers only.");
    if (val.length > 10) return setPhoneError("Max 10 digits.");
    setPhoneError("");
    setPhone(val);
  };

  const handleInitiateSignupOrLogin = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');

    if (phone.length < 10) return setPhoneError("Enter a 10-digit number.");

    setIsLoading(true);
    const formData = new FormData(e.target);
    
    let payload = { phone, password: formData.get('password'), role };

    if (!isLogin) {
      payload = { ...payload, name: formData.get('name') };
      if (role === 'Worker') {
        payload.age = formData.get('age');
        payload.village = formData.get('village');
        payload.skill = formData.get('skill');
        payload.experience = formData.get('experience');
        payload.certificate = formData.get('certificate');
      } else {
        payload.company = formData.get('company');
      }

      // Send Sign-Up OTP
      try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const data = await res.json();
        
        if (res.ok) {
          setPendingUserData(payload);
          setOtpSent(true);
        } else {
          setFormError(data.message);
        }
      } catch (err) {
        setFormError("Server connection failed.");
      }
      setIsLoading(false);
    } else {
      // Normal Login
      const res = await onAuth(payload, 'login');
      setIsLoading(false);
      
      if (res.success) onClose();
      else setFormError(res.message || "An error occurred.");
    }
  };

  const handleVerifySignupOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true); setFormError('');
    
    const finalPayload = { ...pendingUserData, otp: otpCode };
    const res = await onAuth(finalPayload, 'register');
    setIsLoading(false);
    
    if (res.success) {
      setOtpSent(false); setIsLogin(true); setOtpCode(''); setPhone(''); 
      setFormSuccess("✅ Phone verified! Account created. Please log in.");
    } else {
      setFormError(res.message);
    }
  };

  // --- FORGOT PASSWORD FUNCTIONS ---
  const handleSendForgotOtp = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    if (phone.length < 10) return setPhoneError("Enter a valid 10-digit number.");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/send-forgot-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotStep(2);
        setFormSuccess("OTP Sent to your phone.");
      } else {
        setFormError(data.message);
      }
    } catch(err) {
      setFormError("Server connection failed.");
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFormError(''); setFormSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: otpCode, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setFormSuccess("✅ Password reset successful! Please log in.");
        setIsForgotPass(false);
        setForgotStep(1);
        setOtpCode('');
        setNewPassword('');
        setPhone('');
      } else {
        setFormError(data.message);
      }
    } catch(err) {
      setFormError("Server connection failed.");
    }
    setIsLoading(false);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPass(false);
    setForgotStep(1);
    setFormError(''); setFormSuccess(''); setPhoneError(''); setPhone(''); setOtpSent(false); setOtpCode('');
  };

  // Rendering Forgot Password View
  if (isForgotPass) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-scale-up">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Reset Password</h2>
            {formError && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-lg mt-2">{formError}</p>}
            {formSuccess && <p className="text-green-700 font-bold text-sm bg-green-50 p-2 rounded-lg mt-2">{formSuccess}</p>}
          </div>

          {forgotStep === 1 ? (
            <form onSubmit={handleSendForgotOtp} className="space-y-4">
              <p className="text-sm text-gray-600 font-medium">Enter your registered phone number below. We'll send an OTP to verify your identity.</p>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Registered Phone</label>
                <input required value={phone} onChange={handlePhoneChange} type="text" placeholder="10-digit mobile" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none" />
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-brand text-white font-extrabold py-4 rounded-xl mt-4">
                {isLoading ? 'Sending...' : 'Send Verification OTP'}
              </button>
              <button type="button" onClick={() => setIsForgotPass(false)} className="w-full mt-2 text-gray-500 font-bold hover:text-gray-800">Cancel</button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Enter OTP</label>
                <input required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} type="text" placeholder="6-digit code" className="w-full px-4 py-3 rounded-xl border border-brand bg-green-50 outline-none font-bold text-center tracking-widest text-xl" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                <input required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="Enter new password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 outline-none" />
              </div>
              <button disabled={isLoading} type="submit" className="w-full bg-brand text-white font-extrabold py-4 rounded-xl mt-4">
                {isLoading ? 'Updating...' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Standard Login/Signup Rendering
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-scale-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
            {isLogin ? 'Welcome back' : (otpSent ? 'Verify Phone' : 'Join Rural Job Operations')}
          </h2>
          {formError && <p className="text-red-500 font-bold text-sm bg-red-50 p-2 rounded-lg mt-2">{formError}</p>}
          {formSuccess && <p className="text-green-700 font-bold text-sm bg-green-50 border border-green-200 p-3 rounded-lg mt-2">{formSuccess}</p>}
        </div>

        {!otpSent ? (
          <>
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button type="button" onClick={() => {setRole('Worker'); setFormError(''); setFormSuccess('');}} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'Worker' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}>Worker</button>
              <button type="button" onClick={() => {setRole('Admin'); setFormError(''); setFormSuccess('');}} className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${role === 'Admin' ? 'bg-white shadow-sm text-brand' : 'text-gray-500'}`}>Admin (Employer)</button>
            </div>

            <form className="space-y-4" onSubmit={handleInitiateSignupOrLogin}>
              {!isLogin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input required name="name" type="text" placeholder="e.g. Ramesh Kumar" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                </div>
              )}

              {!isLogin && role === 'Worker' && (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Age</label>
                      <input required name="age" type="number" placeholder="e.g. 28" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Village/Town</label>
                      <input required name="village" type="text" placeholder="e.g. Shirur" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">What do you do for work?</label>
                    <select required name="skill" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50">
                      <option value="">Select your work...</option>
                      <option value="Painter">Painter</option>
                      <option value="Farmer / Agri Worker">Farmer / Agri Worker</option>
                      <option value="Carpenter">Carpenter</option>
                      <option value="Cleaner">Cleaner</option>
                      <option value="Home Constructor">Home Constructor / Mason</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Plumber">Plumber</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">What level is your work?</label>
                    <select required name="experience" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50">
                      <option value="">Select experience...</option>
                      <option value="Fresher">Fresher / Helper (Learning)</option>
                      <option value="Experienced">Experienced (Can do standard jobs)</option>
                      <option value="Expert">Expert (Master level)</option>
                    </select>
                  </div>
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <label className="block text-sm font-bold text-brand-dark mb-1">Aadhaar / Skill India ID (Optional)</label>
                    <p className="text-xs text-green-700 mb-2">Provide an ID to get Auto-Verified and bypass manual admin approval!</p>
                    <input name="certificate" type="text" placeholder="Enter Certification Number..." className="w-full px-4 py-3 rounded-xl border border-green-300 focus:ring-2 focus:ring-brand outline-none bg-white" />
                  </div>
                </>
              )}

              {!isLogin && role === 'Admin' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Company / Farm Name (Optional)</label>
                  <input name="company" type="text" placeholder="e.g. Ramesh Farms" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 flex justify-between">
                  Phone Number
                  {phoneError && <span className="text-red-500 text-xs font-bold animate-pulse">{phoneError}</span>}
                </label>
                <input required value={phone} onChange={handlePhoneChange} type="text" placeholder="10-digit mobile number" className={`w-full px-4 py-3 rounded-xl border ${phoneError ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'} focus:ring-2 focus:ring-brand outline-none`} />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
                <input required name="password" type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
              </div>

              <button disabled={isLoading} type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all mt-6 text-lg disabled:opacity-50">
                {isLoading ? 'Processing...' : (isLogin ? `Log In as ${role}` : 'Sign Up (Send OTP)')}
              </button>
            </form>
          </>
        ) : (
          <form className="space-y-4" onSubmit={handleVerifySignupOtp}>
            <p className="text-center text-gray-600 mb-4 font-medium">We sent an SMS with a verification code to +91 {pendingUserData?.phone}</p>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1 text-center">Enter OTP Code</label>
              <input required value={otpCode} onChange={(e) => setOtpCode(e.target.value)} type="text" placeholder="e.g. 123456" className="w-full px-4 py-4 text-center tracking-[0.5em] text-2xl font-black rounded-xl border border-brand bg-green-50 outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <button disabled={isLoading} type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold py-4 rounded-xl shadow-lg transition-all text-lg mt-2">
              {isLoading ? 'Verifying...' : 'Verify & Register'}
            </button>
            <button type="button" onClick={() => setOtpSent(false)} className="w-full mt-2 text-gray-500 font-bold hover:text-gray-800 transition-colors">
              Go Back
            </button>
          </form>
        )}

        {!otpSent && (
          <div className="mt-6 text-center text-sm text-gray-600 font-medium flex flex-col gap-2">
            <div>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={toggleMode} className="text-brand font-black hover:underline transition-all">
                {isLogin ? 'Register now' : 'Log in instead'}
              </button>
            </div>
            {isLogin && (
              <button onClick={() => { setIsForgotPass(true); setFormError(''); setFormSuccess(''); }} className="text-gray-500 font-bold hover:text-gray-800 transition-all text-xs">
                Forgot Password?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Apply Job Modal Component ---
const ApplyJobModal = ({ isOpen, onClose, job, currentUser, onSubmitApply }) => {
  if (!isOpen || !job) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const applicationStatus = currentUser.isVerified ? 'Auto-Approved' : 'Pending';

    const applicationData = {
      workerId: currentUser._id, 
      workerName: currentUser.name,
      workerPhone: currentUser.phone,
      workerSkill: currentUser.skill,
      isVerified: currentUser.isVerified,
      additionalInfo: formData.get('additionalInfo'),
      status: applicationStatus
    };
    onSubmitApply(job._id, applicationData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl relative animate-scale-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Job Application</h2>
          <p className="text-brand font-bold mt-1">{job.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`p-4 rounded-xl border ${currentUser.isVerified ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className="text-xs text-gray-500 font-bold uppercase mb-2">Your Details</p>
            <p className="font-medium text-sm flex items-center gap-2">Name: <span className="font-bold text-gray-800">{currentUser.name}</span> {currentUser.isVerified && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold border border-green-300">Verified ID</span>}</p>
            <p className="font-medium text-sm">Skill: <span className="font-bold text-gray-800">{currentUser.skill} ({currentUser.experience})</span></p>
            <p className="font-medium text-sm">Phone: <span className="font-bold text-gray-800">{currentUser.phone}</span></p>
            {currentUser.isVerified && <p className="mt-3 text-xs text-brand font-bold">✨ Because your ID is verified, this application will be auto-approved!</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Additional Information</label>
            <textarea required name="additionalInfo" rows="3" placeholder="Tell the admin why you are a good fit for this job or when you can start..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50"></textarea>
          </div>

          <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-lg">
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---
const App = () => {
  const [jobs, setJobs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/jobs`)
      .then(res => res.json())
      .then(data => setJobs(data))
      .catch(err => console.error("Error fetching jobs:", err));
  }, []);

  const handleAuth = async (payload, action) => {
    try {
      const res = await fetch(`${API_URL}/auth/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (action === 'login') {
          setCurrentUser(data.user);
        }
        return { success: true };
      } else {
        return { success: false, message: data.message || data.error || "Server rejected the request." };
      }
    } catch (err) {
      console.error("Network Fetch Error:", err);
      return { success: false, message: "⚠️ Server offline: Make sure 'node server.js' is running in your terminal!" };
    }
  };

  const handleAddJob = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Parse tasks separated by commas
    const tasksString = formData.get('tasks');
    const tasksArray = tasksString ? tasksString.split(',').map(t => t.trim()).filter(t => t) : [];

    const newJob = {
      adminId: currentUser._id,
      adminName: currentUser.name,
      adminPhone: currentUser.phone, // NEW: Include the Admin's phone number
      title: formData.get('title'),
      location: formData.get('location'),
      level: formData.get('level'), 
      pay: formData.get('pay'),
      description: formData.get('description'),
      tasks: tasksArray, 
      workersNeeded: Number(formData.get('workersNeeded')),
      hours: formData.get('hours')
    };

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      });
      if (res.ok) {
        const savedJob = await res.json();
        setJobs([savedJob, ...jobs]);
        e.target.reset();
      }
    } catch(err) {
      console.error(err);
    }
  };

  const openApplyModal = (job) => {
    setSelectedJob(job);
    setApplyModalOpen(true);
  };

  const submitApplication = async (jobId, applicationData) => {
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setJobs(jobs.map(job => job._id === jobId ? updatedJob : job));
        setApplyModalOpen(false);
        setSelectedJob(null);
      } else {
        const err = await res.json();
        alert(err.message);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const approveWorker = async (jobId, workerId) => {
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/approve/${workerId}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setJobs(jobs.map(job => job._id === jobId ? updatedJob : job));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const rejectWorker = async (jobId, workerId) => {
    if (!window.confirm("Are you sure you want to reject this worker?")) return;
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/reject/${workerId}`, {
        method: 'PATCH'
      });
      if (res.ok) {
        const updatedJob = await res.json();
        setJobs(jobs.map(job => job._id === jobId ? updatedJob : job));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const adminPostedJobs = jobs.filter(j => currentUser && j.adminId === currentUser._id);

  return (
    <div className="min-h-screen relative font-sans">
      <Navbar currentUser={currentUser} onLoginClick={() => setIsAuthModalOpen(true)} onLogout={() => setCurrentUser(null)} />
      
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="video-hack.mp4" type="video/mp4" />
      </video>
      <div className={`fixed inset-0 z-10 transition-all duration-500 ${currentUser ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/60'}`}></div>

      <div className="relative z-20 pt-28 pb-20 min-h-screen flex flex-col items-center w-full px-4">
        {/* Guest View */}
        {!currentUser && (
          <div className="text-center mt-20 animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-2xl tracking-tight leading-tight">
              Empowering <br/><span className="text-brand">Rural Operations</span>
            </h1>
            <p className="text-xl text-gray-200 mb-10 drop-shadow-md font-medium max-w-2xl mx-auto">
              Connect skilled local workers with verified employers directly in your village.
            </p>
            <button onClick={() => setIsAuthModalOpen(true)} className="bg-white text-brand px-10 py-4 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition-all">
              Join the Network
            </button>
          </div>
        )}

        {/* Worker Dashboard */}
        {currentUser && currentUser.role === 'Worker' && (
          <div className="w-full max-w-5xl animate-fade-in-up">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-white shadow-2xl mb-12">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-4xl font-extrabold">Welcome, {currentUser.name}!</h2>
                {currentUser.isVerified && <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg">Verified User ✅</span>}
              </div>
              <p className="text-gray-300 text-lg mb-6">Your active worker profile:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Work Type</span>
                  <span className="text-lg font-bold text-brand">{currentUser.skill}</span>
                </div>
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Level</span>
                  <span className="text-lg font-bold">{currentUser.experience}</span>
                </div>
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Location</span>
                  <span className="text-lg font-bold">{currentUser.village}</span>
                </div>
                <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-1">Phone</span>
                  <span className="text-lg font-bold">{currentUser.phone}</span>
                </div>
              </div>
            </div>

            <h3 className="text-3xl font-extrabold text-white mb-6 border-b border-white/20 pb-4">Available Jobs In Your Area</h3>
            
            {jobs.length === 0 ? (
              <div className="bg-black/40 text-center py-12 rounded-2xl border border-white/10">
                <p className="text-gray-400 text-lg font-medium">No jobs have been posted by admins yet. Please check back later!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {jobs.map(job => {
                  const myApplication = job.applicants.find(a => a.workerId === currentUser._id);
                  const applyStatus = myApplication ? myApplication.status : null;

                  return (
                    <div key={job._id} className="bg-white p-6 rounded-2xl shadow-xl flex flex-col justify-between hover:shadow-2xl transition-all hover:-translate-y-1">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-2xl font-black text-gray-900">{job.title}</h4>
                          <span className="bg-green-100 text-brand-dark px-3 py-1 rounded-md text-xs font-bold uppercase">{job.level} Needed</span>
                        </div>
                        <p className="text-gray-600 mb-4">{job.description}</p>

                        {/* NEW: EMPLOYER CONTACT INFO (Only shows if Approved) */}
                        {(applyStatus === 'Approved' || applyStatus === 'Auto-Approved') && (
                          <div className="mb-4 bg-green-50 border border-green-200 p-4 rounded-xl">
                            <h5 className="font-bold text-green-900 mb-1 flex items-center gap-2">📞 Employer Contact</h5>
                            <p className="text-sm text-green-800 font-medium">Hired by: <span className="font-bold">{job.adminName}</span></p>
                            <p className="text-sm text-green-800 font-medium">Phone: <span className="font-bold">{job.adminPhone || "Not provided"}</span></p>
                          </div>
                        )}

                        {/* THE TO-DO LIST */}
                        {(applyStatus === 'Approved' || applyStatus === 'Auto-Approved') && (
                          <div className="mb-4 bg-blue-50 border border-blue-200 p-4 rounded-xl">
                            <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">📋 Your To-Do List</h5>
                            {job.tasks && job.tasks.length > 0 ? (
                              <ul className="space-y-2">
                                {job.tasks.map((task, index) => (
                                  <li key={index} className="flex items-center gap-2 text-sm font-medium text-blue-800">
                                    <input type="checkbox" className="w-4 h-4 text-brand bg-white border-gray-300 rounded" />
                                    {task}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm italic text-blue-600">No specific tasks listed by admin.</p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-500 font-medium mb-6">
                          <div className="flex items-center gap-1">📍 {job.location}</div>
                          <div className="flex items-center gap-1">⏱️ {job.hours}</div>
                          <div className="flex items-center gap-1">👥 Need {job.workersNeeded}</div>
                          <div className="flex items-center gap-1">🏢 {job.adminName}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center border-t pt-4">
                        <span className="text-2xl font-black text-gray-800">{job.pay}</span>
                        {!applyStatus && (
                          <button onClick={() => openApplyModal(job)} className="bg-brand hover:bg-brand-dark text-white px-6 py-3 rounded-xl font-black shadow-lg hover:shadow-xl transition-all">
                            Apply Now
                          </button>
                        )}
                        {applyStatus === 'Pending' && (
                          <div className="bg-yellow-500 text-white px-6 py-3 rounded-xl font-black shadow cursor-not-allowed">⏳ Pending Admin Approval</div>
                        )}
                        {applyStatus === 'Rejected' && (
                          <div className="bg-red-500 text-white px-6 py-3 rounded-xl font-black shadow cursor-not-allowed">❌ Application Rejected</div>
                        )}
                        {(applyStatus === 'Approved' || applyStatus === 'Auto-Approved') && (
                          <div className="bg-green-600 text-white px-6 py-3 rounded-xl font-black shadow cursor-not-allowed">✅ {applyStatus}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Admin Dashboard */}
        {currentUser && currentUser.role === 'Admin' && (
          <div className="w-full max-w-6xl animate-fade-in-up flex flex-col gap-10">
            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border-4 border-brand/20">
              <div className="mb-6">
                <h2 className="text-3xl font-extrabold text-brand mb-1">Post a New Job Offer</h2>
                <p className="text-gray-600 font-medium">Fill details to assign work and instantly notify local workers.</p>
              </div>

              <form className="space-y-5" onSubmit={handleAddJob}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Work Title</label>
                    <input required name="title" type="text" placeholder="e.g. Need Plumber for House" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Location / Village</label>
                    <input required name="location" type="text" placeholder="Where is the work?" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Detailed Description</label>
                  <textarea required name="description" rows="2" placeholder="Describe what exactly needs to be done..." className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50"></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">To-Do List / Checklists for Workers</label>
                  <textarea name="tasks" rows="2" placeholder="Enter tasks separated by commas (e.g. Dig hole, Lay pipe, Fill soil)" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50"></textarea>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Pay Offered</label>
                    <input required name="pay" type="text" placeholder="e.g. ₹600/day" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Experience Level</label>
                    <select required name="level" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50">
                      <option value="Any Level">Any Level</option>
                      <option value="Fresher">Fresher</option>
                      <option value="Experienced">Experienced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Workers Needed</label>
                    <input required name="workersNeeded" type="number" min="1" placeholder="e.g. 2" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Working Hours</label>
                    <input required name="hours" type="text" placeholder="e.g. 9AM - 5PM" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand outline-none bg-gray-50" />
                  </div>
                </div>

                <button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white font-extrabold py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all text-xl mt-4">
                  Publish Job
                </button>
              </form>
            </div>

            <div className="w-full">
              <h3 className="text-2xl font-extrabold text-white mb-4">Jobs You Have Assigned / Posted:</h3>
              {adminPostedJobs.length === 0 ? (
                <div className="bg-black/30 border border-white/10 p-8 rounded-2xl text-center">
                  <p className="text-gray-400 font-medium">You haven't posted any jobs yet. Fill the form above to assign work.</p>
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
                  {adminPostedJobs.map(job => (
                    <div key={job._id} className="snap-start shrink-0 w-[400px] bg-white rounded-2xl shadow-xl p-6 flex flex-col border-l-8 border-brand">
                      <div className="mb-4">
                        <h4 className="text-xl font-black text-gray-900 mb-2">{job.title}</h4>
                        <div className="space-y-1 text-sm font-medium text-gray-500 border-b pb-4">
                          <p>📍 {job.location} | 💰 {job.pay}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex-1 overflow-y-auto max-h-64">
                        <span className="text-xs font-bold uppercase text-gray-500 block mb-3 border-b pb-1">
                          Requests ({job.applicants.length})
                        </span>
                        {job.applicants.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {job.applicants.map(app => (
                              <div key={app.workerId} className={`p-3 rounded-lg border shadow-sm ${app.isVerified ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{app.workerName} {app.isVerified && '✅'}</p>
                                    <p className="text-xs text-brand font-bold">{app.workerSkill}</p>
                                  </div>
                                  
                                  {app.status === 'Pending' && (
                                    <div className="flex flex-col gap-1">
                                      <button onClick={() => approveWorker(job._id, app.workerId)} className="bg-brand text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-brand-dark transition-colors">
                                        Approve
                                      </button>
                                      <button onClick={() => rejectWorker(job._id, app.workerId)} className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-red-600 transition-colors">
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  
                                  {app.status === 'Rejected' && (
                                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded border border-red-200">❌ Rejected</span>
                                  )}

                                  {app.status === 'Approved' && (
                                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded border border-green-200">✅ Approved</span>
                                  )}
                                  {app.status === 'Auto-Approved' && (
                                    <span className="text-xs font-bold text-brand bg-green-100 px-2 py-1 rounded border border-green-300">⚡ Auto-Approved</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 bg-white p-2 rounded italic border border-gray-100">"{app.additionalInfo}"</p>
                                <p className="text-xs text-gray-500 mt-2 font-medium">📞 {app.workerPhone}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm italic text-center py-4">No requests yet. Waiting for workers...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onAuth={handleAuth} />
      <ApplyJobModal isOpen={applyModalOpen} onClose={() => setApplyModalOpen(false)} job={selectedJob} currentUser={currentUser} onSubmitApply={submitApplication} />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
