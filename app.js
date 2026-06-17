/* ===================================================
   K-SWAP — Application Logic
   =================================================== */
(function () {
  'use strict';

  // ============ CONFIG ============
  const CONFIG = {
    SUPABASE_URL: 'https://uuhdifydwsamxwptvcyr.supabase.co',
    SUPABASE_KEY: 'sb_publishable_oQish1kHV4eWnlGbLAHUnQ_KQmjZNMF',
    APP_EMAIL: 'kswap.kiit@gmail.com',
  };

  // ============ SUPABASE ============
  let sb = null;
  let isLive = false;
  try {
    if (typeof supabase !== 'undefined' && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
      sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
      isLive = true;
    }
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }

  // ============ STATE ============
  let realtimeSub = null; // Supabase realtime subscription
  const state = {
    user: null,
    profile: null,
    currentPage: 'landing',
    previousPage: 'home',
    currentChat: null,
    listings: [],       // real listings from Supabase
    myListings: [],     // locally posted listings (before refresh)
    savedIds: new Set(),
    searchTerm: '',
    activeCategory: 'all',
    selectedRating: 0,
    imageFiles: [],
  };

  // ============ DEMO DATA ============
  const GRADIENTS = {
    books: 'linear-gradient(135deg,#667eea,#764ba2)',
    labcoats: 'linear-gradient(135deg,#cbd5e1,#64748b)',
    tech: 'linear-gradient(135deg,#f59e0b,#ef4444)',
    cycles: 'linear-gradient(135deg,#10b981,#06b6d4)',
    room: 'linear-gradient(135deg,#ec4899,#8b5cf6)',
    notes: 'linear-gradient(135deg,#f59e0b,#84cc16)',
    clothing: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
    gaming: 'linear-gradient(135deg,#ef4444,#f59e0b)',
    other: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  };

  const EMOJI = {
    books: '📚', labcoats: '🥼', tech: '💻', cycles: '🚲',
    room: '🏠', notes: '📝', clothing: '👕', gaming: '🎮', other: '📦',
  };

  const demoListings = [
    { id: 1, title: 'Engineering Mathematics — B.S. Grewal (44th Ed.)', category: 'books', type: 'sale', price: 250, condition: 'Good', seller: 'Rahul K.', roll: '22053142', location: 'Campus 12 Gate', time: '2h ago', description: 'Used for 1 semester only. No markings or highlights. Cover intact.', views: 47 },
    { id: 2, title: 'Casio fx-991EX Scientific Calculator', category: 'tech', type: 'barter', price: 0, condition: 'Like New', seller: 'Priya S.', roll: '22051078', location: 'Campus 6 Library', time: '4h ago', description: 'Want to exchange for a good pair of earphones or a mouse.', barterWants: 'Good earphones or wireless mouse', views: 32 },
    { id: 3, title: 'White Lab Coat — Size M', category: 'labcoats', type: 'sale', price: 150, condition: 'Good', seller: 'Amit R.', roll: '21052341', location: 'KP-5 Canteen', time: '5h ago', description: 'Used for one year. Clean and pressed. No stains.', views: 28 },
    { id: 4, title: 'Complete NCERT Set — Class 12 PCM', category: 'books', type: 'free', price: 0, condition: 'Fair', seller: 'Sneha M.', roll: '23054201', location: 'Campus 20', time: '6h ago', description: 'Giving away my 12th class books. First come first served! All 6 books included.', views: 89 },
    { id: 5, title: 'Study Table + Chair Combo', category: 'room', type: 'sale', price: 800, condition: 'Good', seller: 'Vikram P.', roll: '21053456', location: 'KP-7 Lobby', time: '8h ago', description: 'Solid wooden study table with cushioned chair. Graduating next month, must sell.', views: 61 },
    { id: 6, title: 'Previous Year Papers — CSE 3rd Sem (All Subjects)', category: 'notes', type: 'free', price: 0, condition: 'Good', seller: 'Ananya D.', roll: '22053890', location: 'Campus 15', time: '10h ago', description: 'Handwritten + printed. Covers all 6 subjects with solutions.', views: 124 },
    { id: 7, title: 'Hero Sprint Cycle — 21 Speed', category: 'cycles', type: 'sale', price: 2500, condition: 'Good', seller: 'Rohan J.', roll: '21054567', location: 'Campus 3 Parking', time: '12h ago', description: 'Well maintained. New tires last month. All gears working perfectly.', views: 53 },
    { id: 8, title: 'Arduino Uno Starter Kit (Complete)', category: 'tech', type: 'barter', price: 0, condition: 'Like New', seller: 'Kavya N.', roll: '22052345', location: 'Campus 14 Lab', time: '1d ago', description: 'Includes breadboard, jumper wires, LEDs, resistors, sensors, servo motor. Everything in original box.', barterWants: 'Raspberry Pi or ESP32 board', views: 41 },
    { id: 9, title: 'Desert Air Cooler — Symphony', category: 'room', type: 'sale', price: 1200, condition: 'Good', seller: 'Arjun S.', roll: '21051234', location: 'KP-9', time: '1d ago', description: 'Works perfectly. Shifting to AC hostel so don\'t need it. 3 speed settings, big water tank.', views: 37 },
    { id: 10, title: 'Data Structures & Algorithms — Cormen (CLRS)', category: 'books', type: 'sale', price: 320, condition: 'Like New', seller: 'Nisha T.', roll: '22053456', location: 'Campus 6 Canteen', time: '1d ago', description: 'Hardcover international edition. No highlights. Used it to crack 3 coding contests.', views: 68 },
    { id: 11, title: 'KIIT Hoodie — Black XL', category: 'clothing', type: 'sale', price: 400, condition: 'Like New', seller: 'Dev M.', roll: '23051234', location: 'Campus 11', time: '2d ago', description: 'Official KIIT merch from fest. Wore twice. Wrong size for me.', views: 29 },
    { id: 12, title: 'Logitech G402 Gaming Mouse', category: 'gaming', type: 'sale', price: 900, condition: 'Good', seller: 'Saurabh K.', roll: '21053678', location: 'KP-6 Room', time: '2d ago', description: 'Great condition. Side buttons work fine. Upgrading to wireless.', views: 44 },
  ];

  const demoChats = [
    { id: 1, name: 'Rahul K.', roll: '22053142', item: 'Engineering Mathematics', gradient: GRADIENTS.books, unread: 2,
      messages: [
        { text: 'Hey, is the Grewal book still available?', sent: false, time: '2:30 PM' },
        { text: 'Yes! It\'s in good condition. When do you want to meet?', sent: true, time: '2:32 PM' },
        { text: 'Can you do ₹200 instead of ₹250?', sent: false, time: '2:35 PM' },
      ] },
    { id: 2, name: 'Priya S.', roll: '22051078', item: 'Scientific Calculator', gradient: GRADIENTS.tech, unread: 0,
      messages: [
        { text: 'Hi! I have boAt earphones to trade for your calculator', sent: true, time: '11:00 AM' },
        { text: 'Which model? Are they wireless?', sent: false, time: '11:15 AM' },
      ] },
    { id: 3, name: 'Amit R.', roll: '21052341', item: 'Lab Coat', gradient: GRADIENTS.labcoats, unread: 1,
      messages: [
        { text: 'Is the lab coat still available? Need it for tomorrow\'s practical', sent: false, time: 'Yesterday' },
      ] },
    { id: 4, name: 'Sneha M.', roll: '23054201', item: 'NCERT Set', gradient: GRADIENTS.books, unread: 0,
      messages: [
        { text: 'Hey, I\'d love the NCERT set! I\'m in Campus 20 too 🙌', sent: true, time: 'Yesterday' },
        { text: 'Sure! Come to Room 312, KP-20 anytime after 5 PM', sent: false, time: 'Yesterday' },
        { text: 'Amazing, see you at 5:30!', sent: true, time: 'Yesterday' },
      ] },
  ];

  const demoNotifications = [
    { id: 1, icon: '💬', iconBg: 'rgba(139,92,246,0.12)', text: '<strong>Rahul K.</strong> sent you a message about <strong>Engineering Mathematics</strong>', time: '5 min ago', unread: true },
    { id: 2, icon: '⭐', iconBg: 'rgba(245,158,11,0.12)', text: '<strong>Sneha M.</strong> gave you a 5-star rating!', time: '1 hour ago', unread: true },
    { id: 3, icon: '👁️', iconBg: 'rgba(6,182,212,0.12)', text: 'Your listing <strong>Study Table</strong> got 50 views', time: '3 hours ago', unread: false },
    { id: 4, icon: '🎉', iconBg: 'rgba(16,185,129,0.12)', text: 'Welcome to K-SWAP! Start by posting your first listing.', time: '1 day ago', unread: false },
    { id: 5, icon: '📢', iconBg: 'rgba(245,158,11,0.12)', text: '<strong>Semester Start Sale</strong> — 20+ new books listed this week!', time: '2 days ago', unread: false },
  ];

  const demoReviews = [
    { name: 'Sneha M.', stars: 5, text: 'Super smooth trade! Came on time, item was exactly as described. Would trade again!', date: '2 days ago' },
    { name: 'Rohan J.', stars: 4, text: 'Good seller. Item was slightly more used than described but still fair deal.', date: '1 week ago' },
    { name: 'Kavya N.', stars: 5, text: 'Amazing! Gave me extra cables with the Arduino kit. 10/10 recommend!', date: '2 weeks ago' },
  ];

  // ============ NAVIGATION ============
  function navigate(page) {
    // Save previous page for back button
    if (state.currentPage !== page && state.currentPage !== 'landing') {
      state.previousPage = state.currentPage;
    }

    document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
    var target = document.getElementById('page-' + page) || document.getElementById(page);
    if (target) {
      target.classList.add('active');
      target.style.animation = 'none';
      target.offsetHeight;
      target.style.animation = null;
      state.currentPage = page;
    }

    // Bottom nav
    var nav = document.getElementById('bottom-nav');
    var hideNav = ['landing', 'auth', 'chat-detail', 'detail'].indexOf(page) !== -1;
    nav.classList.toggle('visible', !hideNav);

    // Active nav item
    document.querySelectorAll('.nav-item').forEach(function (n) { n.classList.remove('active'); });
    var activeNav = document.querySelector('.nav-item[data-page="' + page + '"]');
    if (activeNav) activeNav.classList.add('active');

    window.scrollTo(0, 0);

    // Render page content
    if (page === 'home') renderHome();
    if (page === 'market') renderMarketplace();
    if (page === 'chats') renderChats();
    if (page === 'profile') renderProfile();
    if (page === 'notifications') renderNotifications();
  }
  window.navigate = navigate;

  function goBack() {
    navigate(state.previousPage || 'home');
  }
  window.goBack = goBack;

  function showSignup() {
    navigate('auth');
    toggleAuth('signup');
  }
  window.showSignup = showSignup;

  function scrollToFaq() {
    var el = document.getElementById('landing-faq');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
  window.scrollToFaq = scrollToFaq;

  function navigateFooter(page) {
    navigate(page);
  }
  window.navigateFooter = navigateFooter;

  // ============ AUTH ============
  function toggleAuth(form) {
    document.getElementById('form-login').classList.toggle('active', form === 'login');
    document.getElementById('form-signup').classList.toggle('active', form === 'signup');
    document.getElementById('form-forgot').classList.toggle('active', form === 'forgot');
  }
  window.toggleAuth = toggleAuth;

  // OTP Flow variables
  let currentLoginEmail = '';
  let currentSignupData = null;

  async function handleLogin(e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim().toLowerCase();
    if (!email || !email.includes('@')) { showToast('Please enter a valid email', 'error'); return; }
    if (email.endsWith('@kiit.ac.in')) { showToast('Use the personal email you signed up with, not your KIIT email', 'error'); return; }

    currentLoginEmail = email;
    var btn = document.getElementById('btn-login');
    btn.textContent = 'Sending OTP...';
    btn.disabled = true;

    if (isLive && sb) {
      try {
        var res = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
        if (res.error) {
          if (res.error.message && res.error.message.toLowerCase().includes('signup')) {
            showToast('No account found with this email. Please sign up first.', 'error');
          } else {
            throw res.error;
          }
          btn.textContent = 'Send OTP →'; btn.disabled = false;
          return;
        }
        // Show OTP step
        document.getElementById('login-step-1').style.display = 'none';
        document.getElementById('login-step-2').style.display = 'block';
        showToast('OTP sent to ' + email, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to send OTP', 'error');
      }
    } else {
      // Demo mode fallback
      document.getElementById('login-step-1').style.display = 'none';
      document.getElementById('login-step-2').style.display = 'block';
      showToast('Demo Mode: Enter any 6 digits', 'success');
    }
    btn.textContent = 'Send OTP →';
    btn.disabled = false;
  }
  window.handleLogin = handleLogin;

  async function verifyLoginOtp() {
    var otp = document.getElementById('login-otp').value.trim();
    if (!otp || otp.length !== 6) { showToast('Enter valid 6-digit OTP', 'error'); return; }

    var btn = document.getElementById('btn-verify-login');
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    if (isLive && sb) {
      try {
        var res = await sb.auth.verifyOtp({ email: currentLoginEmail, token: otp, type: 'email' });
        if (res.error) throw res.error;
        state.user = res.data.user;
        var profileRes = await sb.from('profiles').select('*').eq('id', res.data.user.id).single();
        state.profile = profileRes.data || { full_name: currentLoginEmail.split('@')[0], roll_number: '', school: 'KIIT', branch: '', year: '' };
        await loadRealListings();
        showToast('Welcome back! 👋', 'success');
        navigate('home');
      } catch (err) {
        showToast('Invalid OTP or expired', 'error');
      }
    } else {
      var rollNo = currentLoginEmail.split('@')[0];
      state.user = { id: 'demo-' + rollNo, email: currentLoginEmail };
      state.profile = { full_name: 'KIIT Student', roll_number: rollNo, school: 'SCSE', branch: 'CSE', year: '3rd Year', bio: 'Ready to trade on K-SWAP! 🚀' };
      showToast('Welcome! (Demo Mode) 👋', 'success');
      navigate('home');
    }
    btn.textContent = 'Verify & Log In';
    btn.disabled = false;
  }
  window.verifyLoginOtp = verifyLoginOtp;

  function resetLoginForm() {
    document.getElementById('login-step-1').style.display = 'block';
    document.getElementById('login-step-2').style.display = 'none';
    document.getElementById('login-otp').value = '';
  }
  window.resetLoginForm = resetLoginForm;

  // KIIT roll number format validation (7-9 digits, starts with valid batch year)
  function isValidKIITRoll(roll) {
    if (!/^\d{7,9}$/.test(roll)) return false;
    var yr = parseInt(roll.substring(0, 2), 10);
    return yr >= 22 && yr <= 26;
  }
  window.isValidKIITRoll = isValidKIITRoll;

  // Live green-tick / red-cross feedback as the student types their roll number
  function liveRollCheck(el) {
    var val = el.value.trim();
    var hint = document.getElementById('roll-hint');
    if (!val) {
      el.style.borderColor = '';
      if (hint) { hint.textContent = "Only currently enrolled KIIT students are eligible · Alumni accounts are not permitted"; hint.style.color = ''; }
      return;
    }
    if (!/^\d{7,9}$/.test(val)) {
      el.style.borderColor = 'var(--danger)';
      if (hint) { hint.textContent = "✗ Roll number must be 7–9 digits"; hint.style.color = 'var(--danger)'; }
      return;
    }
    var yr = parseInt(val.substring(0, 2), 10);
    if (yr >= 18 && yr <= 21) {
      el.style.borderColor = 'var(--danger)';
      if (hint) { hint.textContent = "✗ Batch 20" + yr + " students have graduated — K-SWAP is only for currently enrolled students"; hint.style.color = 'var(--danger)'; }
      return;
    }
    if (isValidKIITRoll(val)) {
      el.style.borderColor = 'var(--success)';
      if (hint) { hint.textContent = "✓ Valid KIIT roll number"; hint.style.color = 'var(--success)'; }
    } else {
      el.style.borderColor = 'var(--danger)';
      if (hint) { hint.textContent = "✗ Enter a valid KIIT roll number (currently enrolled students only)"; hint.style.color = 'var(--danger)'; }
    }
  }
  window.liveRollCheck = liveRollCheck;

  async function handleSignup(e) {
    e.preventDefault();
    var rollNo = document.getElementById('signup-roll').value.trim();
    var email = document.getElementById('signup-email').value.trim().toLowerCase();
    var name = document.getElementById('signup-name').value.trim();
    var school = document.getElementById('signup-school').value;
    var year = document.getElementById('signup-year').value;
    var branch = document.getElementById('signup-branch').value.trim();

    if (!rollNo || !email || !name || !school || !year || !branch) {
      showToast('Please fill all fields', 'error'); return;
    }
    // Check T&C agreement
    var agreeBox = document.getElementById('signup-agree');
    if (agreeBox && !agreeBox.checked) {
      showToast('Please agree to the Terms of Service and Privacy Policy', 'error'); return;
    }
    // Validate roll number format
    if (!/^\d{7,9}$/.test(rollNo)) {
      showToast('Roll number must be 7–9 digits', 'error'); return;
    }
    // Check for alumni
    var batchYr = parseInt(rollNo.substring(0, 2), 10);
    if (batchYr >= 18 && batchYr <= 21) {
      showToast('Batch 20' + batchYr + ' students have graduated. K-SWAP is for currently enrolled students only.', 'error'); return;
    }
    if (!isValidKIITRoll(rollNo)) {
      showToast('Enter a valid KIIT roll number (currently enrolled students only)', 'error'); return;
    }
    // Validate personal email
    if (!email.includes('@')) {
      showToast('Enter a valid email address', 'error'); return;
    }
    if (email.endsWith('@kiit.ac.in')) {
      showToast('Use your personal Gmail — not your KIIT email. KIIT blocks our OTP emails.', 'error'); return;
    }

    currentSignupData = { rollNo, name, school, year, branch, email };

    var btn = document.getElementById('btn-signup');
    btn.textContent = 'Sending OTP...';
    btn.disabled = true;

    if (isLive && sb) {
      try {
        // Check roll number isn't already taken before sending OTP
        var existing = await sb.from('profiles').select('roll_number').eq('roll_number', rollNo).maybeSingle();
        if (existing.data) {
          showToast('This roll number is already registered. Try logging in instead.', 'error');
          btn.textContent = 'Send OTP →'; btn.disabled = false;
          return;
        }
        var res = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true } });
        if (res.error) throw res.error;
        document.getElementById('signup-step-1').style.display = 'none';
        document.getElementById('signup-step-2').style.display = 'block';
        showToast('OTP sent to ' + email, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to send OTP', 'error');
      }
    } else {
      document.getElementById('signup-step-1').style.display = 'none';
      document.getElementById('signup-step-2').style.display = 'block';
      showToast('Demo Mode: Enter any 6 digits', 'success');
    }
    btn.textContent = 'Send OTP →';
    btn.disabled = false;
  }
  window.handleSignup = handleSignup;

  async function verifySignupOtp() {
    var otp = document.getElementById('signup-otp').value.trim();
    if (!otp || otp.length !== 6) { showToast('Enter valid 6-digit OTP', 'error'); return; }

    var btn = document.getElementById('btn-verify-signup');
    btn.textContent = 'Verifying...';
    btn.disabled = true;

    if (isLive && sb && currentSignupData) {
      try {
        var res = await sb.auth.verifyOtp({ email: currentSignupData.email, token: otp, type: 'email' });
        if (res.error) throw res.error;
        
        // Setup profile after verification
        if (res.data.user) {
          await sb.from('profiles').upsert({
            id: res.data.user.id, roll_number: currentSignupData.rollNo, full_name: currentSignupData.name,
            school: currentSignupData.school, branch: currentSignupData.branch, year: currentSignupData.year,
            bio: 'KIIT University student on K-SWAP! 🚀',
          });
          state.user = res.data.user;
          var profileRes = await sb.from('profiles').select('*').eq('id', res.data.user.id).single();
          state.profile = profileRes.data;
          await loadRealListings();
          showToast('Account created successfully! 🎉', 'success');
          navigate('home');
        }
      } catch (err) {
        showToast('Invalid OTP or expired', 'error');
      }
    } else {
      state.user = { id: 'demo-' + currentSignupData.rollNo, email: currentSignupData.email };
      state.profile = { full_name: currentSignupData.name, roll_number: currentSignupData.rollNo, school: currentSignupData.school, branch: currentSignupData.branch, year: currentSignupData.year, bio: 'Ready to trade! 🚀' };
      showToast('Account created! (Demo Mode) 🎉', 'success');
      navigate('home');
    }
    btn.textContent = 'Verify & Create Account';
    btn.disabled = false;
  }
  window.verifySignupOtp = verifySignupOtp;

  function resetSignupForm() {
    document.getElementById('signup-step-1').style.display = 'block';
    document.getElementById('signup-step-2').style.display = 'none';
    document.getElementById('signup-otp').value = '';
  }
  window.resetSignupForm = resetSignupForm;

  async function handleForgot(e) {
    e.preventDefault();
    var rollNo = document.getElementById('forgot-roll').value.trim();
    if (!rollNo) { showToast('Enter your roll number', 'error'); return; }
    var email = rollNo + '@kiit.ac.in';
    var btn = document.getElementById('btn-forgot');
    btn.textContent = 'Sending...';
    btn.disabled = true;

    if (isLive && sb) {
      try {
        var res = await sb.auth.resetPasswordForEmail(email);
        if (res.error) throw res.error;
        showToast('Reset link sent to ' + email + '! Check your inbox.', 'success');
      } catch (err) {
        showToast(err.message || 'Could not send reset link', 'error');
      }
    } else {
      showToast('Reset link sent to ' + email + '! (Demo)', 'success');
    }
    btn.textContent = 'Send Reset Link →';
    btn.disabled = false;
  }
  window.handleForgot = handleForgot;

  function handleLogout() {
    if (isLive && sb) sb.auth.signOut();
    state.user = null;
    state.profile = null;
    state.myListings = [];
    state.savedIds.clear();
    navigate('landing');
    showToast('Logged out', 'success');
  }
  window.handleLogout = handleLogout;

  // ============ LISTING CARD HTML ============
  function cardHTML(item, isH) {
    var g = GRADIENTS[item.category] || GRADIENTS.other;
    var em = EMOJI[item.category] || '📦';
    var bc = item.type === 'sale' ? 'badge-sale' : item.type === 'barter' ? 'badge-barter' : 'badge-free';
    var bt = item.type === 'sale' ? '💰 Sale' : item.type === 'barter' ? '🔄 Barter' : '🎁 Free';
    var priceClass = item.type === 'free' ? 'listing-price free' : item.type === 'barter' ? 'listing-price barter' : 'listing-price';
    var priceText = item.type === 'free' ? 'FREE' : item.type === 'barter' ? 'Barter' : '₹' + item.price;
    var isSaved = state.savedIds.has(item.id);
    var heartClass = isSaved ? 'wishlist-btn saved' : 'wishlist-btn';

    return '<div class="listing-card' + (isH ? ' h-card' : '') + '" onclick="openDetail(' + item.id + ')">' +
      '<div class="listing-img" style="background:' + g + ';">' +
        '<span style="font-size:48px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.3));">' + em + '</span>' +
        '<span class="badge ' + bc + '">' + bt + '</span>' +
        '<button class="' + heartClass + '" onclick="event.stopPropagation();toggleSave(' + item.id + ')">' + (isSaved ? '♥' : '♡') + '</button>' +
      '</div>' +
      '<div class="listing-body">' +
        '<h3>' + item.title + '</h3>' +
        '<span class="' + priceClass + '">' + priceText + '</span>' +
        '<div class="listing-meta"><span>👤 ' + item.seller + '</span><span>📍 ' + item.location + '</span></div>' +
        '<div class="listing-meta"><span>🕐 ' + item.time + '</span></div>' +
      '</div></div>';
  }

  // ============ RENDER HOME ============
  function renderHome() {
    var nameEl = document.getElementById('home-name');
    if (state.profile && state.profile.full_name) {
      nameEl.textContent = state.profile.full_name.split(' ')[0];
    }

    // Notification dot
    var hasUnread = demoNotifications.some(function (n) { return n.unread; });
    document.querySelectorAll('.notif-dot').forEach(function (d) { d.classList.toggle('show', hasUnread); });

    // Daily pick
    var pick = demoListings[Math.floor(Math.random() * 4)]; // top 4
    var dpEl = document.getElementById('daily-pick');
    var pickPriceText = pick.type === 'free' ? 'FREE' : pick.type === 'barter' ? 'Barter' : '₹' + pick.price;
    dpEl.innerHTML = '<div class="daily-pick-inner" onclick="openDetail(' + pick.id + ')">' +
      '<div class="daily-pick-img" style="background:' + (GRADIENTS[pick.category] || GRADIENTS.other) + ';border-radius:12px;">' + (EMOJI[pick.category] || '📦') + '</div>' +
      '<div class="daily-pick-info"><h3>' + pick.title + '</h3><span class="listing-price" style="font-size:16px;">' + pickPriceText + '</span>' +
      '<div class="listing-meta"><span>📍 ' + pick.location + '</span><span>👁️ ' + (pick.views || 0) + ' views</span></div></div></div>';

    // Trending
    var ts = document.getElementById('trending-scroll');
    ts.innerHTML = demoListings.slice(0, 5).map(function (l) { return cardHTML(l, true); }).join('');

    // Recent
    var rg = document.getElementById('recent-grid');
    rg.innerHTML = demoListings.slice(0, 6).map(function (l) { return cardHTML(l, false); }).join('');
  }

  // ============ RENDER MARKETPLACE ============
  function renderMarketplace() {
    var grid = document.getElementById('market-grid');
    var items = demoListings.concat(state.myListings);

    if (state.activeCategory !== 'all') {
      items = items.filter(function (i) { return i.category === state.activeCategory; });
    }
    if (state.searchTerm) {
      var q = state.searchTerm.toLowerCase();
      items = items.filter(function (i) {
        return i.title.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)) || i.seller.toLowerCase().includes(q);
      });
    }
    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><div class="empty-icon">🔍</div><h3>No items found</h3><p>Try a different search or category</p></div>';
    } else {
      grid.innerHTML = items.map(function (l) { return cardHTML(l, false); }).join('');
    }
  }

  function handleSearch(val) {
    state.searchTerm = val;
    renderMarketplace();
  }
  window.handleSearch = handleSearch;

  function marketFilter(cat, el) {
    state.activeCategory = cat;
    el.parentElement.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
    el.classList.add('active');
    renderMarketplace();
  }
  window.marketFilter = marketFilter;

  function filterHome(cat) {
    var pills = document.querySelectorAll('#page-home .pill');
    pills.forEach(function (p) { p.classList.remove('active'); });
    event.target.classList.add('active');
    state.activeCategory = cat;
    navigate('market');
    var mpills = document.querySelectorAll('#page-market .pill');
    mpills.forEach(function (p) { p.classList.toggle('active', p.dataset.cat === cat); });
    renderMarketplace();
  }
  window.filterHome = filterHome;

  // ============ ITEM DETAIL ============
  function openDetail(id) {
    var item = getAllListings().find(function (l) { return l.id === id; });
    if (!item) return;
    state.currentDetailItem = item;

    var g = GRADIENTS[item.category] || GRADIENTS.other;
    var em = EMOJI[item.category] || '📦';

    document.getElementById('detail-image').style.background = g;
    document.getElementById('detail-image').innerHTML = '<span style="font-size:72px;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));">' + em + '</span>';

    var bc = item.type === 'sale' ? 'badge-sale' : item.type === 'barter' ? 'badge-barter' : 'badge-free';
    var bt = item.type === 'sale' ? '💰 Sale' : item.type === 'barter' ? '🔄 Barter' : '🎁 Free';
    document.getElementById('detail-badge').className = 'badge ' + bc;
    document.getElementById('detail-badge').textContent = bt;
    document.getElementById('detail-condition-badge').textContent = item.condition || 'Good';
    document.getElementById('detail-title').textContent = item.title;

    var priceEl = document.getElementById('detail-price');
    if (item.type === 'free') { priceEl.textContent = 'FREE'; priceEl.className = 'detail-price free'; }
    else if (item.type === 'barter') { priceEl.textContent = 'Open to Barter'; priceEl.className = 'detail-price barter'; }
    else { priceEl.textContent = '₹' + item.price; priceEl.className = 'detail-price'; }

    document.getElementById('detail-location').textContent = item.location || 'Campus';
    document.getElementById('detail-time').textContent = item.time || 'Recently';
    document.getElementById('detail-views').textContent = item.views || Math.floor(Math.random() * 80 + 10);
    document.getElementById('detail-desc').textContent = item.description || 'No description provided.';

    var barterSec = document.getElementById('detail-barter-section');
    if (item.type === 'barter' && item.barterWants) {
      barterSec.style.display = 'block';
      document.getElementById('detail-barter-wants').textContent = item.barterWants;
    } else {
      barterSec.style.display = 'none';
    }

    // Seller card
    var sellerAvatar = document.getElementById('detail-seller-avatar');
    sellerAvatar.textContent = (item.seller || 'S').charAt(0);
    sellerAvatar.style.background = g;
    document.getElementById('detail-seller-name').textContent = item.seller || 'Seller';
    document.getElementById('detail-seller-info').textContent = (item.roll || '') + '@kiit.ac.in • ⭐ Verified Student';
    document.getElementById('detail-seller-rating').textContent = (4 + Math.random()).toFixed(1);

    // Heart
    var isSaved = state.savedIds.has(item.id);
    document.getElementById('detail-heart').textContent = isSaved ? '♥' : '♡';
    document.getElementById('detail-heart').style.color = isSaved ? '#ef4444' : '';

    // Related items
    var related = demoListings.filter(function (l) { return l.category === item.category && l.id !== item.id; }).slice(0, 4);
    document.getElementById('detail-related').innerHTML = related.map(function (l) { return cardHTML(l, true); }).join('');

    navigate('detail');
  }
  window.openDetail = openDetail;

  function messageFromDetail() {
    if (!state.currentDetailItem) return;
    var item = state.currentDetailItem;
    var chat = demoChats.find(function (c) { return c.name === item.seller; });
    if (!chat) {
      chat = {
        id: Date.now(), name: item.seller, roll: item.roll || '', item: item.title,
        gradient: GRADIENTS[item.category] || GRADIENTS.other, unread: 0,
        messages: [{ text: 'Hi! I\'m interested in your listing: ' + item.title, sent: true, time: 'Just now' }],
      };
      demoChats.unshift(chat);
    }
    openChatDetail(chat.id);
  }
  window.messageFromDetail = messageFromDetail;

  function shareItem() {
    if (!state.currentDetailItem) return;
    var text = 'Check out "' + state.currentDetailItem.title + '" on K-SWAP! ' + window.location.href;
    if (navigator.share) {
      navigator.share({ title: 'K-SWAP', text: text, url: window.location.href });
    } else {
      navigator.clipboard.writeText(text).then(function () { showToast('Link copied! 📋', 'success'); });
    }
  }
  window.shareItem = shareItem;

  // ============ WISHLIST ============
  function toggleSave(id) {
    if (state.savedIds.has(id)) { state.savedIds.delete(id); showToast('Removed from saved', ''); }
    else { state.savedIds.add(id); showToast('Saved! ♥', 'success'); }
    // Re-render current page
    if (state.currentPage === 'home') renderHome();
    if (state.currentPage === 'market') renderMarketplace();
    if (state.currentPage === 'profile') renderProfile();
    // Update detail heart if on detail page
    if (state.currentPage === 'detail' && state.currentDetailItem) {
      var isSaved = state.savedIds.has(state.currentDetailItem.id);
      document.getElementById('detail-heart').textContent = isSaved ? '♥' : '♡';
      document.getElementById('detail-heart').style.color = isSaved ? '#ef4444' : '';
    }
  }
  window.toggleSave = toggleSave;

  function toggleWishlist() {
    if (state.currentDetailItem) toggleSave(state.currentDetailItem.id);
  }
  window.toggleWishlist = toggleWishlist;

  // ============ POST LISTING ============
  function selectType(type) {
    document.getElementById('post-type').value = type;
    ['sale', 'barter', 'free'].forEach(function (t) {
      document.getElementById('type-' + t).className = 'type-btn' + (t === type ? ' active-' + t : '');
    });
    document.getElementById('price-group').style.display = type === 'sale' ? 'block' : 'none';
    document.getElementById('barter-group').style.display = type === 'barter' ? 'block' : 'none';
  }
  window.selectType = selectType;

  function handleImagePreview(input) {
    var files = Array.from(input.files).slice(0, 4);
    state.imageFiles = files;
    var row = document.getElementById('img-preview-row');
    var placeholder = document.getElementById('img-upload-placeholder');
    if (files.length > 0) {
      placeholder.style.display = 'none';
      row.style.display = 'flex';
      row.innerHTML = '';
      files.forEach(function (f) {
        var img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        row.appendChild(img);
      });
    } else {
      placeholder.style.display = 'block';
      row.style.display = 'none';
    }
  }
  window.handleImagePreview = handleImagePreview;

  async function handlePost(e) {
    e.preventDefault();
    var title = document.getElementById('post-title').value.trim();
    var category = document.getElementById('post-category').value;
    var type = document.getElementById('post-type').value;
    var price = type === 'sale' ? parseInt(document.getElementById('post-price').value) || 0 : 0;
    var condition = document.getElementById('post-condition').value;
    var description = document.getElementById('post-desc').value.trim();
    var location = document.getElementById('post-location').value.trim();
    var barterWants = type === 'barter' ? document.getElementById('post-barter').value.trim() : '';

    if (!title || !category) { showToast('Please fill item name and category', 'error'); return; }

    var imageUrl = '';

    // Upload image to Supabase Storage
    if (isLive && sb && state.user && state.imageFiles.length > 0) {
      try {
        var file = state.imageFiles[0];
        var ext = file.name.split('.').pop();
        var path = state.user.id + '/' + Date.now() + '.' + ext;
        var uploadRes = await sb.storage.from('listings').upload(path, file, { cacheControl: '3600', upsert: false });
        if (!uploadRes.error) {
          var urlRes = sb.storage.from('listings').getPublicUrl(path);
          imageUrl = urlRes.data.publicUrl;
        }
      } catch (err) { console.warn('Image upload error:', err); }
    }

    var newListing = {
      id: Date.now(), title: title, category: category, type: type, price: price,
      condition: condition, description: description, location: location || 'Campus',
      barterWants: barterWants, image_url: imageUrl,
      seller: state.profile ? state.profile.full_name : 'You',
      roll: state.profile ? state.profile.roll_number : '',
      time: 'Just now', views: 0,
    };

    // Save to Supabase
    if (isLive && sb && state.user) {
      try {
        await sb.from('listings').insert({
          user_id: state.user.id, title: title, category: category,
          type: type, price: price, condition: condition,
          description: description,
          barter_wants: barterWants,
          location: location, image_url: imageUrl,
        });
      } catch (err) { console.warn('Supabase insert error:', err); }
    }

    state.myListings.unshift(newListing);
    showToast('Listing posted! 🎉', 'success');

    // Reset form
    document.getElementById('form-post').reset();
    selectType('sale');
    document.getElementById('img-upload-placeholder').style.display = 'block';
    document.getElementById('img-preview-row').style.display = 'none';
    state.imageFiles = [];

    setTimeout(function () { navigate('market'); }, 600);
  }
  window.handlePost = handlePost;

  // ============ CHATS (Real-time with Supabase) ============
  function getChatKey(chatObj) {
    // Unique key for a conversation: sorted user IDs + item name
    if (chatObj._chatKey) return chatObj._chatKey;
    var myId = state.user ? state.user.id : 'demo';
    return 'chat_' + myId + '_' + (chatObj.roll || chatObj.name) + '_' + (chatObj.item || '').replace(/\s+/g, '_').substring(0, 30);
  }

  function renderChats() {
    var list = document.getElementById('chats-list');
    var empty = document.getElementById('chats-empty');
    var totalUnread = demoChats.reduce(function (s, c) { return s + c.unread; }, 0);

    var badge = document.getElementById('chat-badge');
    if (totalUnread > 0) { badge.style.display = 'flex'; badge.textContent = totalUnread; }
    else { badge.style.display = 'none'; }

    if (demoChats.length === 0) { list.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    list.innerHTML = demoChats.map(function (c) {
      var lastMsg = c.messages[c.messages.length - 1];
      return '<div class="chat-item" onclick="openChatDetail(' + c.id + ')">' +
        '<div class="chat-avatar-lg" style="background:' + c.gradient + ';">' + c.name.charAt(0) + '</div>' +
        '<div class="chat-info"><h3>' + c.name + '</h3><p>' + lastMsg.text + '</p></div>' +
        '<div class="chat-meta-side"><div class="time">' + lastMsg.time + '</div>' +
        (c.unread > 0 ? '<div class="chat-unread">' + c.unread + '</div>' : '') +
        '</div></div>';
    }).join('');
  }

  async function openChatDetail(chatId) {
    var chat = demoChats.find(function (c) { return c.id === chatId; });
    if (!chat) return;
    state.currentChat = chat;
    chat.unread = 0;

    document.getElementById('cd-name').textContent = chat.name;
    document.getElementById('cd-item').textContent = chat.item;
    var avatar = document.getElementById('cd-avatar');
    avatar.textContent = chat.name.charAt(0);
    avatar.style.background = chat.gradient;
    avatar.style.color = '#fff';

    // Load messages from Supabase if live
    var chatKey = getChatKey(chat);
    if (isLive && sb && state.user) {
      try {
        var res = await sb.from('messages').select('*').eq('chat_key', chatKey).order('created_at', { ascending: true }).limit(100);
        if (res.data && res.data.length > 0) {
          chat.messages = res.data.map(function (m) {
            var d = new Date(m.created_at);
            return {
              text: m.content,
              sent: m.sender_id === state.user.id,
              time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'),
            };
          });
        }
      } catch (err) { console.warn('Load messages error:', err); }

      // Subscribe to real-time messages
      subscribeToChat(chatKey);
    }

    renderChatMessages();
    navigate('chat-detail');
  }
  window.openChatDetail = openChatDetail;

  function subscribeToChat(chatKey) {
    // Unsubscribe from previous
    if (realtimeSub) {
      sb.removeChannel(realtimeSub);
      realtimeSub = null;
    }
    if (!isLive || !sb) return;

    realtimeSub = sb.channel('chat_' + chatKey)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: 'chat_key=eq.' + chatKey,
      }, function (payload) {
        var m = payload.new;
        // Don't duplicate our own messages
        if (state.user && m.sender_id === state.user.id) return;
        if (!state.currentChat) return;
        var d = new Date(m.created_at);
        state.currentChat.messages.push({
          text: m.content, sent: false,
          time: d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0'),
        });
        renderChatMessages();
      })
      .subscribe();
  }

  function renderChatMessages() {
    if (!state.currentChat) return;
    var c = document.getElementById('cd-messages');
    c.innerHTML = state.currentChat.messages.map(function (m) {
      return '<div class="msg ' + (m.sent ? 'sent' : 'received') + '">' + m.text + '<div class="msg-time">' + m.time + '</div></div>';
    }).join('');
    setTimeout(function () { c.scrollTop = c.scrollHeight; }, 50);
  }

  async function sendMessage() {
    var input = document.getElementById('chat-input');
    var text = input.value.trim();
    if (!text || !state.currentChat) return;
    var now = new Date();
    var time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    state.currentChat.messages.push({ text: text, sent: true, time: time });
    input.value = '';
    renderChatMessages();

    // Save to Supabase
    var chatKey = getChatKey(state.currentChat);
    if (isLive && sb && state.user) {
      try {
        await sb.from('messages').insert({
          chat_key: chatKey,
          sender_id: state.user.id,
          sender_name: state.profile ? state.profile.full_name : 'Student',
          content: text,
        });
      } catch (err) { console.warn('Send message error:', err); }
    }

    // Simulate reply only in demo mode
    if (!isLive) {
      setTimeout(function () {
        if (!state.currentChat) return;
        var replies = [
          'Sounds good! When are you free to meet?', 'Let me think about it 🤔',
          'Sure, that works! 👍', 'Can we meet at the campus canteen?',
          'I\'ll be free after 5 PM today', 'That\'s a fair offer. Let\'s do it!',
          'Can you come to Campus 6?', 'I can do a small discount. How about ₹50 less?',
      ];
        state.currentChat.messages.push({ text: replies[Math.floor(Math.random() * replies.length)], sent: false, time: time });
        renderChatMessages();
      }, 1200 + Math.random() * 1000);
    }
  }
  window.sendMessage = sendMessage;

  function sendCounterOffer() {
    document.getElementById('chat-input').value = '💰 Counter Offer: How about ₹';
    document.getElementById('chat-input').focus();
  }
  window.sendCounterOffer = sendCounterOffer;

  function acceptDeal() {
    if (!state.currentChat) return;
    var now = new Date();
    var time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    state.currentChat.messages.push({ text: '✅ Deal accepted! Let\'s meet up and trade. See you soon! 🤝', sent: true, time: time });
    renderChatMessages();
    showToast('Deal accepted! 🎉', 'success');
  }
  window.acceptDeal = acceptDeal;

  function reportUser() {
    showToast('Report sent. We\'ll review within 24 hours.', 'success');
  }
  window.reportUser = reportUser;

  // ============ NOTIFICATIONS ============
  function renderNotifications() {
    var list = document.getElementById('notif-list');
    list.innerHTML = demoNotifications.map(function (n) {
      return '<div class="notif-item' + (n.unread ? ' unread' : '') + '">' +
        '<div class="notif-icon" style="background:' + n.iconBg + ';">' + n.icon + '</div>' +
        '<div class="notif-content"><p>' + n.text + '</p><div class="notif-time">' + n.time + '</div></div></div>';
    }).join('');
  }

  function clearNotifications() {
    demoNotifications.forEach(function (n) { n.unread = false; });
    renderNotifications();
    document.querySelectorAll('.notif-dot').forEach(function (d) { d.classList.remove('show'); });
    showToast('All notifications marked as read', 'success');
  }
  window.clearNotifications = clearNotifications;

  // ============ PROFILE ============
  function renderProfile() {
    if (!state.profile) return;
    var p = state.profile;
    document.getElementById('profile-initials').textContent = (p.full_name || 'K').charAt(0).toUpperCase();
    document.getElementById('profile-fullname').textContent = p.full_name || 'KIIT Student';
    document.getElementById('profile-details').textContent = [p.roll_number, p.school, p.branch, p.year].filter(Boolean).join(' • ');
    document.getElementById('profile-bio').textContent = p.bio || 'Ready to trade on K-SWAP! 🚀';
    document.getElementById('stat-listed').textContent = state.myListings.length;
    document.getElementById('stat-saved').textContent = state.savedIds.size;

    // My listings tab
    var grid = document.getElementById('my-listings-grid');
    var empty = document.getElementById('my-listings-empty');
    if (state.myListings.length === 0) {
      grid.style.display = 'none'; empty.style.display = 'block';
    } else {
      grid.style.display = 'grid'; empty.style.display = 'none';
      grid.innerHTML = state.myListings.map(function (l) { return cardHTML(l, false); }).join('');
    }

    // Saved tab
    var savedGrid = document.getElementById('saved-grid');
    var savedEmpty = document.getElementById('saved-empty');
    var savedItems = getAllListings().filter(function (l) { return state.savedIds.has(l.id); });
    if (savedItems.length === 0) {
      savedGrid.style.display = 'none'; savedEmpty.style.display = 'block';
    } else {
      savedGrid.style.display = 'grid'; savedEmpty.style.display = 'none';
      savedGrid.innerHTML = savedItems.map(function (l) { return cardHTML(l, false); }).join('');
    }

    // Reviews tab
    var reviewsList = document.getElementById('reviews-list');
    var reviewsEmpty = document.getElementById('reviews-empty');
    if (demoReviews.length === 0) {
      reviewsList.innerHTML = ''; reviewsEmpty.style.display = 'block';
    } else {
      reviewsEmpty.style.display = 'none';
      reviewsList.innerHTML = demoReviews.map(function (r) {
        var stars = '';
        for (var i = 0; i < 5; i++) stars += i < r.stars ? '★' : '☆';
        return '<div class="review-item">' +
          '<div class="review-header"><div class="review-avatar">' + r.name.charAt(0) + '</div>' +
          '<div><div class="review-name">' + r.name + '</div><div class="review-stars">' + stars + '</div></div></div>' +
          '<div class="review-text">' + r.text + '</div>' +
          '<div class="review-date">' + r.date + '</div></div>';
      }).join('');
    }
  }

  function switchProfileTab(tab, el) {
    document.querySelectorAll('.profile-tab').forEach(function (t) { t.classList.remove('active'); });
    el.classList.add('active');
    document.querySelectorAll('.profile-tab-content').forEach(function (c) { c.style.display = 'none'; });
    document.getElementById('tab-' + tab).style.display = 'block';
  }
  window.switchProfileTab = switchProfileTab;

  // ============ RATING MODAL ============
  function openRatingModal() {
    state.selectedRating = 0;
    document.querySelectorAll('.star').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById('modal-review').value = '';
    document.getElementById('modal-overlay').classList.add('show');
  }
  window.openRatingModal = openRatingModal;

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
  }
  window.closeModal = closeModal;

  function setRating(val) {
    state.selectedRating = val;
    document.querySelectorAll('.star').forEach(function (s) {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
  }
  window.setRating = setRating;

  function submitRating() {
    if (state.selectedRating === 0) { showToast('Please select a rating', 'error'); return; }
    var reviewText = document.getElementById('modal-review').value.trim();
    if (state.currentChat) {
      demoReviews.unshift({
        name: state.profile ? state.profile.full_name : 'You',
        stars: state.selectedRating,
        text: reviewText || 'Great trade!',
        date: 'Just now',
      });
    }
    closeModal();
    showToast('Review submitted! ⭐', 'success');
  }
  window.submitRating = submitRating;

  // ============ FAQ ACCORDION ============
  function toggleFaq(el) {
    var wasOpen = el.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(function (f) { f.classList.remove('open'); });
    if (!wasOpen) el.classList.add('open');
  }
  window.toggleFaq = toggleFaq;

  // ============ SHARE ============
  function shareApp() {
    var url = window.location.href;
    var text = 'Check out K-SWAP — the marketplace for KIIT students! Buy, sell, and barter campus essentials. 🚀';
    if (navigator.share) {
      navigator.share({ title: 'K-SWAP', text: text, url: url });
    } else {
      navigator.clipboard.writeText(url).then(function () { showToast('Link copied! Share it with friends 📋', 'success'); });
    }
  }
  window.shareApp = shareApp;

  // ============ TOAST ============
  function showToast(message, type) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'show ' + (type || '');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.className = ''; }, 3000);
  }

  // ============ HELPERS ============
  function getAllListings() {
    return state.listings.concat(demoListings).concat(state.myListings);
  }

  // Load real listings from Supabase
  async function loadRealListings() {
    if (!isLive || !sb) return;
    try {
      var res = await sb.from('listings').select('*, profiles(full_name, roll_number)').eq('is_active', true).order('created_at', { ascending: false }).limit(50);
      if (res.data) {
        state.listings = res.data.map(function (l) {
          var d = new Date(l.created_at);
          var ago = getTimeAgo(d);
          return {
            id: l.id, title: l.title, category: l.category || 'other',
            type: l.type || 'sale', price: l.price || 0,
            condition: l.condition || 'Good',
            description: l.description || '',
            location: l.location || 'Campus',
            barterWants: l.barter_wants || '',
            image_url: l.image_url || '',
            seller: l.profiles ? l.profiles.full_name : 'Student',
            roll: l.profiles ? l.profiles.roll_number : '',
            time: ago, views: l.views || 0,
            _isReal: true,
          };
        });
      }
    } catch (err) { console.warn('Load listings error:', err); }
  }

  function getTimeAgo(date) {
    var seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }

  // ============ INIT ============
  async function init() {
    // Check for existing session
    if (isLive && sb) {
      try {
        var res = await sb.auth.getSession();
        if (res.data.session && res.data.session.user) {
          state.user = res.data.session.user;
          var profileRes = await sb.from('profiles').select('*').eq('id', res.data.session.user.id).single();
          state.profile = profileRes.data || { full_name: 'Student', roll_number: '', school: '', branch: '', year: '' };
          // Load real listings
          await loadRealListings();
          navigate('home');
        }
      } catch (err) {
        console.warn('Session check error:', err);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
