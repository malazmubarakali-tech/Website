/* ============================================================
   web-adapter.js — Bridge between mobile app JS and desktop web
   ============================================================ */

(function() {
    'use strict';

    /* ===== Override showScreen to work with new page-screen class ===== */
    window.showScreen = function(screenId) {
        // Hide all page screens and story screens
        document.querySelectorAll('.page-screen').forEach(s => s.classList.remove('active-screen'));
        document.querySelectorAll('.story-view-screen').forEach(s => {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });

        const target = document.getElementById(screenId + '-screen');
        if (target) {
            target.classList.add('active-screen');
            target.style.display = 'block';
        }

        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`[data-target="${screenId}"]`);
        if (activeTab) activeTab.classList.add('active');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Load screen-specific data
        if (screenId === 'achievements') {
            setTimeout(() => {
                if (typeof loadAchievements === 'function') loadAchievements();
            }, 50);
        }
        if (screenId === 'learn') {
            setTimeout(() => {
                if (typeof loadLearnContent === 'function') loadLearnContent();
            }, 50);
        }
        if (screenId === 'profile') {
            setTimeout(() => {
                if (typeof loadProfile === 'function') loadProfile();
            }, 50);
        }

        // Update hero stats when going home
        if (screenId === 'home') {
            setTimeout(updateHeroStats, 100);
        }
    };

    /* ===== Override switchToMainScreen ===== */
    window.switchToMainScreen = function() {
        cancelTTS && cancelTTS();
        showScreen('home');
    };

    /* ===== Override switchToStoriesScreen ===== */
    window.switchToStoriesScreen = function() {
        showScreen('stories');
        setTimeout(() => {
            if (typeof initStories === 'function') initStories();
            if (typeof showTab === 'function') showTab(currentTab || 0);
        }, 50);
    };

    window.goToStoriesWithDelay = function() {
        setTimeout(switchToStoriesScreen, 300);
    };

    /* ===== Override switchToStoriesList ===== */
    window.switchToStoriesList = function() {
        cancelTTS && cancelTTS();
        stopAllAudio && stopAllAudio();

        // Hide all story screens
        document.querySelectorAll('.story-view-screen').forEach(s => {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });

        showScreen('stories');
    };

    /* ===== Override openStoryDetails to work with sidebar layout ===== */
    window.openStoryDetails = function(index) {
        // Hide all screens
        document.querySelectorAll('.page-screen').forEach(s => s.classList.remove('active-screen'));
        document.querySelectorAll('.story-view-screen').forEach(s => {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });

        const screen = document.getElementById('story-screen-' + index);
        if (screen) {
            screen.classList.add('active-screen');
            screen.style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Load story content
            if (typeof loadStoryContent === 'function') {
                loadStoryContent(index);
            }
        }

        // Update nav
        document.querySelectorAll('.nav-item').forEach(tab => tab.classList.remove('active'));
    };

    /* ===== Override showTab to use new .stab class ===== */
    const _originalShowTab = window.showTab;
    window.showTab = function(index) {
        // Update tab UI
        document.querySelectorAll('.stab').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });

        // Also update old .tab class for compatibility
        document.querySelectorAll('.tab').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });

        currentTab = index;

        // Render the grid
        renderStoriesGrid(index);
    };

    /* ===== Render stories into new web grid ===== */
    function renderStoriesGrid(tabIndex) {
        const container = document.getElementById('content');
        if (!container) return;
        container.innerHTML = '';

        if (typeof stories === 'undefined' || !stories[tabIndex]) return;

        const tabStories = stories[tabIndex];
        if (!tabStories || !tabStories.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">لا توجد قصص في هذا القسم بعد</p>';
            return;
        }

        tabStories.forEach(story => {
            const card = document.createElement('div');
            card.className = 'card';
            const emojiIcon = (typeof emojis !== 'undefined' && emojis[story.id]) || '📖';
            const completed = isStoryCompleted && isStoryCompleted(story.id);

            card.innerHTML = `
                <div class="img-box" style="${completed ? 'background:#d4edda;border-color:#28a745;' : ''}">
                    ${completed ? '<span style="position:absolute;top:6px;right:6px;font-size:16px;">✅</span>' : ''}
                    ${emojiIcon}
                </div>
                <div class="title">${story.title || ''}${story.kr ? '<br><span style="font-family:Fredoka,sans-serif;font-size:12px;color:#a78bfa;direction:ltr;">' + story.kr + '</span>' : ''}</div>
            `;
            card.style.position = 'relative';
            card.addEventListener('click', () => openStoryDetails(story.id));
            container.appendChild(card);
        });
    }

    /* ===== Dynamic story screen creation for web layout ===== */
    window._createDynamicStoryScreen = function(idx, storyData) {
        const existing = document.getElementById('story-screen-' + idx);
        if (existing) return; // Already exists

        const isHorror = idx >= 30; // Horror stories have higher indices
        const titleData = (typeof getStoryTitle === 'function') ? getStoryTitle(idx) : { kr: '', ar: '' };

        const screen = document.createElement('section');
        screen.id = 'story-screen-' + idx;
        screen.className = 'story-view-screen' + (isHorror ? ' horror-story' : '');
        screen.style.display = 'none';

        screen.innerHTML = `
            <div class="story-web-layout">
                <div class="story-sidebar ${isHorror ? 'dark-sidebar' : ''}">
                    <button class="story-back-web" onclick="switchToStoriesList()">
                        <i class="fa-solid fa-arrow-right"></i> رجوع
                    </button>
                    <div class="story-meta-web">
                        <h1>${titleData.kr || '📖'}</h1>
                        <p class="story-cat-tag ${isHorror ? 'horror-tag' : ''}">${getTabName(idx)}</p>
                    </div>
                    <button class="audio-btn-web" id="audioBtn${idx}" onclick="toggleAudio(${idx})">
                        <span id="btnContent${idx}"><i class="fa-solid fa-play"></i> تشغيل الصوت</span>
                    </button>
                    <div class="tts-status" id="ttsStatus${idx}"></div>
                    <div class="lesson web-lesson ${isHorror ? 'dark-lesson' : ''}">
                        <strong>📌 الدرس المستفاد</strong><br>
                        ${titleData.ar || ''}
                    </div>
                    <button class="done-btn-web" onclick="completeStoryAndGoBack()">أنهيت القصة بنجاح! 🎉</button>
                </div>
                <div class="story-content-web">
                    <div class="story-container" id="storyText${idx}"></div>
                </div>
            </div>
        `;

        document.querySelector('.main-wrapper').appendChild(screen);
    };

    function getTabName(idx) {
        if (idx < 10) return 'قصص أطفال';
        if (idx < 20) return 'قصص ممتعة';
        if (idx < 30) return 'قصص عاطفية';
        return 'قصص رعب';
    }

    /* ===== Override initStories to NOT recreate screens naively ===== */
    const _origInitStories = window.initStories;
    window.initStories = function() {
        // Just load content without recreating DOM
        if (typeof allStories !== 'undefined') {
            allStories.forEach((storyData, idx) => {
                const textEl = document.getElementById('storyText' + idx);
                if (textEl && textEl.innerHTML === '') {
                    buildStoryHTML(idx, storyData, textEl);
                }
            });
        }
    };

    function buildStoryHTML(idx, storyData, container) {
        if (!storyData || !container) return;
        let html = '';
        storyData.forEach((sentence, i) => {
            if (sentence.kr) {
                html += `<p class="kr-block"><span id="s${idx}_${i}" class="word">${sentence.kr}</span></p>`;
            }
            if (sentence.ar) {
                html += `<p class="ar-block">${sentence.ar}</p>`;
            }
        });
        container.innerHTML = html;
    }

    /* ===== Override completeStoryAndGoBack ===== */
    const _origComplete = window.completeStoryAndGoBack;
    window.completeStoryAndGoBack = function() {
        // Find current story index
        let currentIdx = -1;
        document.querySelectorAll('.story-view-screen.active-screen').forEach(s => {
            const m = s.id.match(/story-screen-(\d+)/);
            if (m) currentIdx = parseInt(m[1]);
        });

        if (currentIdx >= 0 && typeof saveStoryCompletion === 'function') {
            saveStoryCompletion(currentIdx);
        }

        stopAllAudio && stopAllAudio();
        cancelTTS && cancelTTS();

        showToast('🎉 أحسنت! تم حفظ تقدمك');
        setTimeout(() => {
            switchToStoriesList();
            updateHeroStats();
        }, 600);
    };

    /* ===== Profile loading ===== */
    window.loadProfile = function() {
        const stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');

        const nameEl = document.getElementById('userName');
        if (nameEl) nameEl.textContent = stored.userName || 'متعلم';

        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl) avatarEl.textContent = stored.userAvatar || '😊';

        const streakEl = document.getElementById('streakDays');
        if (streakEl) streakEl.textContent = stored.streakDays || 0;

        const msgEl = document.getElementById('streakMessage');
        if (msgEl) {
            const days = stored.streakDays || 0;
            msgEl.textContent = days === 0 ? 'ابدأ رحلتك اليوم!' :
                days < 7 ? 'استمر، أنت تتحسن!' :
                days < 30 ? 'رائع! أسبوع من التعلم!' :
                '🏆 أنت أسطورة!';
        }

        const hoursEl = document.getElementById('totalHours');
        if (hoursEl) hoursEl.textContent = Math.floor((stored.xp || 0) / 10);

        const rateEl = document.getElementById('completionRate');
        if (rateEl) {
            const total = 40;
            const done = stored.storiesCompleted || 0;
            rateEl.textContent = Math.round((done / total) * 100) + '%';
        }

        const itemsEl = document.getElementById('totalItems');
        if (itemsEl) {
            const total = (stored.storiesCompleted || 0) + (stored.listeningCompleted || 0) + (stored.writingCompleted || 0);
            itemsEl.textContent = total;
        }
    };

    /* ===== Override openEditProfile / closeEditProfile / saveCustomProfile ===== */
    window.openEditProfile = function() {
        const sec = document.getElementById('editProfileSection');
        if (sec) {
            sec.style.display = 'block';
            sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        const stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        const nameInput = document.getElementById('customName');
        if (nameInput) nameInput.value = stored.userName || '';

        // Highlight current avatar
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.avatar === (stored.userAvatar || '😊'));
        });
    };

    window.closeEditProfile = function() {
        const sec = document.getElementById('editProfileSection');
        if (sec) sec.style.display = 'none';
    };

    window.saveCustomProfile = function() {
        const stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        const nameInput = document.getElementById('customName');
        const selectedAvatar = document.querySelector('.avatar-option.selected');

        if (nameInput && nameInput.value.trim()) {
            stored.userName = nameInput.value.trim();
        }
        if (selectedAvatar) {
            stored.userAvatar = selectedAvatar.dataset.avatar;
        }

        localStorage.setItem('korean_app_achievements', JSON.stringify(stored));
        closeEditProfile();
        loadProfile();
        updateHeroStats();
        showToast('✅ تم حفظ التغييرات!');
    };

    // Avatar picker click handler
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('avatar-option')) {
            document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });

    /* ===== Override handleLogout ===== */
    window.handleLogout = function() {
        if (!confirm('هل أنت متأكد من إعادة تعيين كل التقدم؟ لا يمكن التراجع.')) return;
        localStorage.removeItem('korean_app_achievements');
        localStorage.removeItem('used_tips');
        localStorage.removeItem('used_topik');
        localStorage.removeItem('used_motivations');
        showToast('♻️ تم إعادة تعيين التقدم');
        loadProfile();
        loadAchievements();
        updateHeroStats();
    };

    /* ===== Stories preview shortcut navigation ===== */
    window.goToChatWithDelay = function() {
        setTimeout(() => { window.location.href = 'chat.html'; }, 300);
    };
    window.openReading = function() {
        setTimeout(() => { window.location.href = 'reading-menu.html'; }, 300);
    };
    window.openListening = function() {
        setTimeout(() => { window.location.href = 'listening-system.html'; }, 300);
    };
    window.openWriting = function() {
        setTimeout(() => { window.location.href = 'writing-system.html'; }, 300);
    };

    /* ===== Initial load ===== */
    window.addEventListener('load', function() {
        // Make body visible
        document.body.style.visibility = 'visible';

        // Ensure only home screen visible initially
        document.querySelectorAll('.page-screen').forEach(s => {
            if (s.id === 'home-screen') {
                s.classList.add('active-screen');
            } else {
                s.classList.remove('active-screen');
            }
        });
        document.querySelectorAll('.story-view-screen').forEach(s => {
            s.style.display = 'none';
        });

        // Load all initial data
        setTimeout(() => {
            loadLearnContent && loadLearnContent();
            loadAchievements && loadAchievements();
            loadProfile();
            updateHeroStats();
            loadStoriesPreview();
        }, 200);

        // Navigate to stories if URL param
        if (window.location.search.includes('go=stories')) {
            history.replaceState(null, '', window.location.pathname);
            setTimeout(switchToStoriesScreen, 400);
        }

        console.log('✅ Web adapter ready');
    });

    /* ===== Stub functions that aren't needed on web ===== */
    window.bindNavigationEvents = function() {};

})();
