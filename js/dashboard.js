// Dashboard Logic using Supabase

// DOM Elements
const addHabitBtn = document.getElementById('add-habit-btn');
const addHabitModal = document.getElementById('add-habit-modal');
const modalClose = document.getElementById('modal-close');
const cancelBtn = document.getElementById('cancel-btn');
const editHabitModal = document.getElementById('edit-habit-modal');
const editModalClose = document.getElementById('edit-modal-close');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const currentDate = document.getElementById('current-date');
const newHabitForm = document.getElementById('new-habit-form');
const editHabitForm = document.getElementById('edit-habit-form');
const habitTableBody = document.querySelector('.habit-table tbody');
const dateDisplay = document.querySelector('.date-display');
const notificationBtn = document.querySelector('.notification-btn');
const notificationsModal = document.getElementById('notifications-modal');
const notificationsClose = document.getElementById('notifications-close');
const calendarModal = document.getElementById('calendar-modal');
const calendarClose = document.getElementById('calendar-close');

let currentUser = null;
let currentUserId = null; // Stores PostgreSQL Integer ID
let editingHabitId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async function () {
    updateCurrentDate();
    setInterval(updateCurrentDate, 60000);

    // Check auth
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = session.user;

    await loadUserProfile();
    await fetchHabits();
    await updateAnalytics();
    await loadAchievements();
    await loadRecentActivity();
    await loadNotifications();

    // Auth listeners
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Modal listeners
    if (addHabitBtn) addHabitBtn.addEventListener('click', () => addHabitModal.style.display = 'flex');
    if (modalClose) modalClose.addEventListener('click', () => addHabitModal.style.display = 'none');
    if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); addHabitModal.style.display = 'none'; });

    if (editModalClose) editModalClose.addEventListener('click', () => editHabitModal.style.display = 'none');
    if (editCancelBtn) editCancelBtn.addEventListener('click', (e) => { e.preventDefault(); editHabitModal.style.display = 'none'; });

    // Notifications & Calendar
    if (notificationBtn) notificationBtn.addEventListener('click', () => { if (notificationsModal) notificationsModal.style.display = 'flex'; });
    if (notificationsClose) notificationsClose.addEventListener('click', () => { if (notificationsModal) notificationsModal.style.display = 'none'; });

    if (dateDisplay) dateDisplay.addEventListener('click', () => { if (calendarModal) calendarModal.style.display = 'flex'; });
    if (calendarClose) calendarClose.addEventListener('click', () => { if (calendarModal) calendarModal.style.display = 'none'; });

    window.addEventListener('click', (e) => {
        if (e.target === addHabitModal) addHabitModal.style.display = 'none';
        if (e.target === editHabitModal) editHabitModal.style.display = 'none';
        if (e.target === notificationsModal) notificationsModal.style.display = 'none';
        if (e.target === calendarModal) calendarModal.style.display = 'none';
    });
});

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    if (currentDate) currentDate.textContent = now.toLocaleDateString('en-US', options);
}

// 1. User Module
async function loadUserProfile() {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('email', currentUser.email)
        .single();

    if (!error && data) {
        currentUserId = data.id;
        const profileUsername = document.getElementById('profile-username');
        if (profileUsername) profileUsername.textContent = data.username || currentUser.email.split('@')[0];
    } else {
        const profileUsername = document.getElementById('profile-username');
        if (profileUsername) profileUsername.textContent = currentUser.email.split('@')[0];
        console.error("Could not fetch integer user ID:", error);
    }
}

// 2. Habit Module
async function fetchHabits() {
    habitTableBody.innerHTML = '<tr><td colspan="7">Loading habits...</td></tr>';

    const { data: habits, error: habitsError } = await supabaseClient
        .from('habits')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (habitsError) {
        console.error("Error fetching habits:", habitsError);
        habitTableBody.innerHTML = '<tr><td colspan="7">Error loading habits</td></tr>';
        return;
    }

    // Fetch streaks
    const { data: streaks, error: streaksError } = await supabaseClient
        .from('streaks')
        .select('*')
        .eq('user_id', currentUserId);

    const streakMap = {};
    if (!streaksError && streaks) {
        streaks.forEach(s => {
            streakMap[s.habit_id] = s;
        });
    }

    window.globalAllHabits = habits; // Cache for other views
    renderHabits(habits, streakMap);
}

function renderHabits(habits, streakMap) {
    if (!habits || habits.length === 0) {
        habitTableBody.innerHTML = '<tr><td colspan="7">No habits found. Add one to get started!</td></tr>';
        return;
    }

    habitTableBody.innerHTML = '';

    habits.forEach(habit => {
        const streakInfo = streakMap[habit.id] || { current_streak: 0, longest_streak: 0, last_completed_date: null };
        const isCompletedToday = isToday(streakInfo.last_completed_date);

        // Map category (color) to UI format
        let colorClass = 'other';
        let icon = 'fa-star';
        let hexColor = habit.color || '#3498db';

        // Approximate to initial UI based on color or title logic can go here. We'll use random from UI but persist it if saved.

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="habit-name">
                    <div class="habit-icon" style="background-color: ${hexColor};">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div>
                        <strong>${habit.title}</strong>
                        <p class="habit-frequency">${capitalize(habit.frequency)}</p>
                    </div>
                </div>
            </td>
            <td>
                <span class="description-text" style="font-size: 0.9em; color: #555;">${habit.description || 'No description'}</span>
            </td>
            <td>
                <div class="streak-display">
                    <i class="fas fa-fire" style="color: #e74c3c;"></i>
                    <span>${streakInfo.current_streak} days</span>
                </div>
            </td>
            <td>${streakInfo.longest_streak} days</td>
            <td>
                <div class="consistency-cell">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${calculateConsistency(habit.target_days, streakInfo.current_streak)}%; background-color: #2ecc71;"></div>
                    </div>
                    <span>${calculateConsistency(habit.target_days, streakInfo.current_streak)}%</span>
                </div>
            </td>
            <td>${formatDate(habit.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn mark-complete" data-id="${habit.id}" title="${isCompletedToday ? 'Completed today' : 'Mark as complete'}" style="${isCompletedToday ? 'background-color: #2ecc71; color: white;' : ''}">
                        <i class="${isCompletedToday ? 'fas fa-check-circle' : 'fas fa-check'}"></i>
                    </button>
                    <button class="action-btn edit-btn" data-id="${habit.id}" data-title="${habit.title}" data-desc="${habit.description}" data-freq="${habit.frequency}" title="Edit habit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${habit.id}" title="Delete habit">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        habitTableBody.appendChild(tr);
    });

    // Attach listeners
    document.querySelectorAll('.mark-complete').forEach(btn => btn.addEventListener('click', handleMarkComplete));
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', handleEditClick));
    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', handleDeleteClick));
}

// Add Habit
newHabitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('habit-name').value;
    const desc = document.getElementById('habit-category').value;
    const frequency = document.getElementById('habit-frequency').value;
    const time = document.getElementById('habit-time').value;

    // Generate random color for UI
    const colors = ['#3498db', '#9b59b6', '#e74c3c', '#f39c12', '#1abc9c', '#e67e22'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const { data: newHabit, error } = await supabaseClient
        .from('habits')
        .insert([{
            user_id: currentUserId,
            title: title,
            description: desc,
            frequency: frequency,
            color: randomColor,
            is_active: true,
            target_days: 30
        }])
        .select();

    if (error) {
        alert("Failed to add habit: " + error.message);
        return;
    }

    // Create initial streak record
    if (newHabit && newHabit.length > 0) {
        await supabaseClient.from('streaks').insert([{
            habit_id: newHabit[0].id,
            user_id: currentUserId,
            current_streak: 0,
            longest_streak: 0
        }]);
    }

    newHabitForm.reset();
    addHabitModal.style.display = 'none';
    fetchHabits();
    updateAnalytics();
});

// Edit Habit
function handleEditClick(e) {
    const btn = e.currentTarget;
    editingHabitId = btn.dataset.id;
    document.getElementById('edit-habit-name').value = btn.dataset.title || '';
    document.getElementById('edit-habit-category').value = btn.dataset.desc || '';
    document.getElementById('edit-habit-frequency').value = btn.dataset.freq || 'daily';
    editHabitModal.style.display = 'flex';
}

editHabitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('edit-habit-name').value;
    const desc = document.getElementById('edit-habit-category').value;
    const frequency = document.getElementById('edit-habit-frequency').value;

    const { error } = await supabaseClient
        .from('habits')
        .update({ title: title, description: desc, frequency: frequency })
        .eq('id', editingHabitId)
        .eq('user_id', currentUserId);

    if (error) {
        alert("Failed to update habit: " + error.message);
        return;
    }

    editHabitModal.style.display = 'none';
    fetchHabits();
});

// Delete Habit (Hard Delete)
async function handleDeleteClick(e) {
    const id = e.currentTarget.dataset.id;
    if (confirm("Are you sure you want to completely delete this habit from the database?")) {
        // Delete child logs to prevent PostgreSQL foreign-key constraint blocks
        await supabaseClient.from('habit_logs').delete().eq('habit_id', id);
        await supabaseClient.from('streaks').delete().eq('habit_id', id);

        // Safely delete parent habit
        const { error } = await supabaseClient
            .from('habits')
            .delete()
            .eq('id', id)
            .eq('user_id', currentUserId);

        if (!error) {
            fetchHabits();
            updateAnalytics();
        } else {
            alert("Delete failed: " + error.message);
        }
    }
}

// 3. Streak Engine Module
async function handleMarkComplete(e) {
    const btn = e.currentTarget;
    const habitId = btn.dataset.id;

    // Prompt user for a note/review
    const note = prompt("Way to go! Would you like to add a quick note or review for today's completion?", "");
    if (note === null) return; // User clicked Cancel, abort marking complete

    // First figure out if already logged today
    const todayStr = new Date().toISOString().split('T')[0];

    const { data: logs, error: checkError } = await supabaseClient
        .from('habit_logs')
        .select('*')
        .eq('habit_id', habitId)
        .eq('completed_date', todayStr);

    if (logs && logs.length > 0) {
        alert("Already completed today!");
        return;
    }

    // Insert Log
    const { error: logError } = await supabaseClient
        .from('habit_logs')
        .insert([{
            habit_id: habitId,
            user_id: currentUserId,
            completed_date: todayStr,
            status: true,
            notes: note
        }]);

    if (logError) {
        alert("Failed to log completion: " + logError.message + "\n\n(Hint: Did you forget to disable RLS for 'habit_logs'?)");
        return;
    }

    // Update Streak Engine
    const { data: streak } = await supabaseClient
        .from('streaks')
        .select('*')
        .eq('habit_id', habitId)
        .single();

    if (streak) {
        // Calculate Streak Rules
        let newCurrent = streak.current_streak + 1;
        let newLongest = Math.max(newCurrent, streak.longest_streak);

        await supabaseClient
            .from('streaks')
            .update({
                current_streak: newCurrent,
                longest_streak: newLongest,
                last_completed_date: todayStr,
                updated_at: new Date().toISOString()
            })
            .eq('id', streak.id);

        checkAchievements(newCurrent);
    }

    fetchHabits();
    updateAnalytics();
    loadRecentActivity();
    loadNotifications();
}

// 4. Analytics Module
async function updateAnalytics() {
    // Active Habits count
    const { data: habits } = await supabaseClient.from('habits').select('id, target_days').eq('user_id', currentUserId).eq('is_active', true);
    const activeHabitCount = habits ? habits.length : 0;

    // Calculate Current Streak sum and Overall Consistency
    const { data: streaks } = await supabaseClient.from('streaks').select('habit_id, current_streak').eq('user_id', currentUserId);
    
    let totalStreak = 0;
    let avgConsistency = 0;
    
    if (streaks && habits && habits.length > 0) {
        let totalConsistencyPercentages = 0;
        
        streaks.forEach(s => {
            totalStreak += (s.current_streak || 0);
            
            // Find parent habit
            const habit = habits.find(h => h.id === s.habit_id);
            if (habit) {
                const target = habit.target_days || 30;
                let consistency = Math.min(100, Math.round((s.current_streak / target) * 100));
                totalConsistencyPercentages += consistency;
            }
        });
        
        avgConsistency = Math.round(totalConsistencyPercentages / habits.length);
    }

    // Find UI elements
    const statCards = document.querySelectorAll('.stat-value');
    if (statCards.length >= 4) {
        statCards[0].textContent = totalStreak + " days";  // Current Streak
        statCards[1].textContent = avgConsistency + "%";   // Overall Consistency
        statCards[2].textContent = activeHabitCount;       // Active Habits
        
        // Total Time mockup calculation (30 mins per habit marked)
        const hrs = Math.floor((totalStreak * 30) / 60);
        const mins = (totalStreak * 30) % 60;
        statCards[3].textContent = `${hrs}h ${mins}m`;
    }
}

// 5. Gamification Module
async function checkAchievements(currentStreak) {
    if (currentStreak === 1 || currentStreak === 7 || currentStreak === 25 || currentStreak === 100) {
        let title = "";
        let icon = "fa-trophy";
        let desc = `Achieved ${currentStreak} day streak!`;
        
        if (currentStreak === 1) { title = "First Step"; icon = "fa-seedling"; desc = "Completed your 1st habit checkmark!"; }
        else if (currentStreak === 7) { title = "Starter"; icon = "fa-star"; }
        else if (currentStreak === 25) { title = "Streak Master"; icon = "fa-fire"; }
        else if (currentStreak === 100) { title = "Century Club"; icon = "fa-gem"; }

        // Ensure not already earned
        const { data: exists } = await supabaseClient
            .from('achievements')
            .select('*')
            .eq('user_id', currentUserId)
            .eq('title', title);

        if (!exists || exists.length === 0) {
            await supabaseClient.from('achievements').insert([{
                user_id: currentUserId,
                title: title,
                badge_icon: icon,
                description: desc
            }]);

            alert(`Achievement Unlocked: ${title}!`);
            loadAchievements();
        }
    }
}

async function loadAchievements() {
    const { data: earnedAchievements } = await supabaseClient
        .from('achievements')
        .select('*')
        .eq('user_id', currentUserId);

    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    // Define all possible platform achievements
    const allBadges = [
        { title: "First Step", desc: "Completed 1st habit", icon: "fa-seedling" },
        { title: "Starter", desc: "7 day streak", icon: "fa-star" },
        { title: "Streak Master", desc: "25 day streak", icon: "fa-fire" },
        { title: "Century Club", desc: "100 day streak", icon: "fa-gem" }
    ];

    grid.innerHTML = '';
    
    allBadges.forEach(badge => {
        // Check if user has this badge in their database row
        const earned = earnedAchievements && earnedAchievements.find(a => a.title === badge.title);
        
        const statusClass = earned ? 'unlocked' : 'locked';
        
        // Locked items show up grayed out via CSS styling (.locked)
        grid.innerHTML += `
            <div class="achievement-badge ${statusClass}">
                <div class="achievement-icon"><i class="fas ${badge.icon}"></i></div>
                <h4>${badge.title}</h4>
                <p>${badge.desc}</p>
            </div>
        `;
    });
}

// 6. Recent Activity & Notifications Module
window.globalAllHabits = []; // Cache for matching titles

async function loadRecentActivity() {
    const { data: logs } = await supabaseClient
        .from('habit_logs')
        .select('*')
        .eq('user_id', currentUserId)
        .order('completed_date', { ascending: false })
        .limit(5);

    const list = document.getElementById('activity-list');
    if (!list) return;

    if (!logs || logs.length === 0) {
        list.innerHTML = '<p class="empty-state" style="color:#64748b; font-style:italic;">No recent activity yet. Start completing habits!</p>';
        return;
    }

    list.innerHTML = '';
    logs.forEach(log => {
        const h = window.globalAllHabits.find(x => x.id === log.habit_id);
        const hName = h ? h.title : "a habit";
        
        list.innerHTML += `
            <div class="activity-item" style="align-items:flex-start;">
                <div class="activity-icon"><i class="fas fa-check-circle"></i></div>
                <div class="activity-content">
                    <p>Completed <strong>${hName}</strong></p>
                    ${log.notes ? `<p style="font-size: 0.85em; color: #555; background: #f8fafc; padding: 4px; border-left: 2px solid #3498db; margin-top: 4px;">"${log.notes}"</p>` : ''}
                    <span class="activity-time">${formatDate(log.completed_date)}</span>
                </div>
            </div>
        `;
    });
}

async function loadNotifications() {
    // We can pull achievements as pseudo-notifications if they don't have a notifications table setup correctly
    const { data: achievements } = await supabaseClient
        .from('achievements')
        .select('*')
        .eq('user_id', currentUserId)
        .order('earned_at', { ascending: false })
        .limit(3);

    const notifBody = document.getElementById('notifications-body');
    const notifCount = document.querySelector('.notification-count');
    
    if (!achievements || achievements.length === 0) {
        if(notifCount) notifCount.textContent = '0';
        if(notifBody) notifBody.innerHTML = '<p style="text-align:center; color:#64748b; font-style:italic; margin-top:20px;">You are all caught up!</p>';
        return;
    }

    if(notifCount) notifCount.textContent = achievements.length;
    if(notifBody) notifBody.innerHTML = '';

    achievements.forEach(ach => {
        notifBody.innerHTML += `
            <div class="notification-item unread">
                <div class="notification-icon"><i class="fas fa-trophy"></i></div>
                <div class="notification-content">
                    <h4>Achievement Unlocked!</h4>
                    <p>You earned the badge: ${ach.title}</p>
                    <span class="notification-time">Recently</span>
                </div>
            </div>
        `;
    });
}

// Helpers
function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(ds) {
    if (!ds) return "";
    const d = new Date(ds);
    return isToday(ds) ? `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleDateString();
}

function isToday(ds) {
    if (!ds) return false;
    const d = new Date(ds);
    const today = new Date();
    return d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
}

function calculateConsistency(targetDays, streak) {
    targetDays = targetDays || 30;
    streak = streak || 0;
    if (streak === 0) return 0;
    return Math.min(100, Math.round((streak / targetDays) * 100));
}

let currentCalendarDate = new Date();

function generateCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const calMonthYear = document.getElementById('calendar-month-year');
    if (calMonthYear) calMonthYear.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Clear previous days
    const calendarDays = document.getElementById('calendar-days');
    if (!calendarDays) return;
    calendarDays.innerHTML = '';

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarDays.appendChild(document.createElement('div'));
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;

        // Let's just color it generically for now, or match it to real habit logs later
        dayElement.classList.add('pending');

        // Highlight today
        const today = new Date();
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayElement.classList.add('today');
        }

        calendarDays.appendChild(dayElement);
    }
}

document.getElementById('prev-month')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    generateCalendar();
});

document.getElementById('next-month')?.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    generateCalendar();
});

// Modal handling logic was moved to top of file
dateDisplay?.addEventListener('click', () => {
    generateCalendar();
});
