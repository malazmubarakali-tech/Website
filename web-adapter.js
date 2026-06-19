/* ============================================================
   web-adapter.js — Fixed version: all 40 stories work
   ============================================================ */

(function () {
    'use strict';

    /* ── تتبع التاب والقصة الحالية ── */
    window.currentTab = 0;
    var _currentStoryIdx = -1;

    /* ══════════════════════════════════════════════
       1.  showScreen — يُظهر أي شاشة رئيسية
    ══════════════════════════════════════════════ */
    window.showScreen = function (screenId) {
        document.querySelectorAll('.page-screen').forEach(function (s) {
            s.classList.remove('active-screen');
        });
        document.querySelectorAll('.story-view-screen').forEach(function (s) {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });

        var target = document.getElementById(screenId + '-screen');
        if (target) {
            target.classList.add('active-screen');
            target.style.display = 'block';
        }

        document.querySelectorAll('.nav-item').forEach(function (t) { t.classList.remove('active'); });
        var activeTab = document.querySelector('[data-target="' + screenId + '"]');
        if (activeTab) activeTab.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (screenId === 'achievements') setTimeout(function () { loadAchievements && loadAchievements(); }, 50);
        if (screenId === 'learn')        setTimeout(function () { loadLearnContent && loadLearnContent(); }, 50);
        if (screenId === 'profile')      setTimeout(function () { window.loadProfile && window.loadProfile(); }, 50);
        if (screenId === 'home')         setTimeout(updateHeroStats, 100);

        /* لما نفتح شاشة القصص — اعرض التاب الحالي */
        if (screenId === 'stories') {
            setTimeout(function () { window.showTab(window.currentTab || 0); }, 80);
        }
    };

    /* ══════════════════════════════════════════════
       2.  التنقل بين الشاشات
    ══════════════════════════════════════════════ */
    window.switchToMainScreen = function () {
        typeof cancelTTS === 'function' && cancelTTS();
        showScreen('home');
    };

    window.switchToStoriesScreen = function () { showScreen('stories'); };
    window.goToStoriesWithDelay  = function () { setTimeout(switchToStoriesScreen, 300); };

    window.switchToStoriesList = function () {
        typeof cancelTTS     === 'function' && cancelTTS();
        typeof stopAllAudio  === 'function' && stopAllAudio();

        document.querySelectorAll('.story-view-screen').forEach(function (s) {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });
        showScreen('stories');
    };

    /* ══════════════════════════════════════════════
       3.  openStoryDetails — يفتح قصة بالـ index
    ══════════════════════════════════════════════ */
    window.openStoryDetails = function (index) {
        /* أنشئ الـ screen إذا لم يكن موجوداً */
        ensureStoryScreen(index);

        document.querySelectorAll('.page-screen').forEach(function (s) { s.classList.remove('active-screen'); });
        document.querySelectorAll('.story-view-screen').forEach(function (s) {
            s.classList.remove('active-screen');
            s.style.display = 'none';
        });

        var screen = document.getElementById('story-screen-' + index);
        if (!screen) { console.warn('Story screen not found:', index); return; }

        screen.classList.add('active-screen');
        screen.style.display = 'block';
        _currentStoryIdx = index;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        /* احشو النص إذا فارغ */
        var textEl = document.getElementById('storyText' + index);
        if (textEl && textEl.innerHTML.trim() === '' && typeof allStories !== 'undefined' && allStories[index]) {
            buildStoryHTML(index, allStories[index], textEl);
        }

        document.querySelectorAll('.nav-item').forEach(function (t) { t.classList.remove('active'); });
    };

    /* ══════════════════════════════════════════════
       4.  showTab — يعرض تاب القصص
    ══════════════════════════════════════════════ */
    window.showTab = function (index) {
        window.currentTab = index;

        document.querySelectorAll('.stab').forEach(function (t, i) {
            t.classList.toggle('active', i === index);
        });
        document.querySelectorAll('.tab').forEach(function (t, i) {
            t.classList.toggle('active', i === index);
        });

        renderStoriesGrid(index);
    };

    /* ══════════════════════════════════════════════
       5.  renderStoriesGrid — يرسم كروت القصص
    ══════════════════════════════════════════════ */
    function renderStoriesGrid(tabIndex) {
        var container = document.getElementById('content');
        if (!container) return;
        container.innerHTML = '';

        if (typeof stories === 'undefined') {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">جاري التحميل…</p>';
            return;
        }

        var tabStories = stories[tabIndex];
        if (!tabStories || !tabStories.length) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">لا توجد قصص في هذا القسم بعد</p>';
            return;
        }

        tabStories.forEach(function (story) {
            var card = document.createElement('div');
            card.className = 'card';

            var emojiIcon = (typeof emojis !== 'undefined' && emojis[story.id]) ? emojis[story.id] : '📖';
            var completed  = typeof isStoryCompleted === 'function' && isStoryCompleted(story.id);

            card.style.position = 'relative';
            card.innerHTML =
                '<div class="img-box" style="' + (completed ? 'background:#d4edda;border-color:#28a745;' : '') + '">' +
                    (completed ? '<span style="position:absolute;top:4px;right:4px;font-size:14px;">✅</span>' : '') +
                    emojiIcon +
                '</div>' +
                '<div class="title">' +
                    (story.title || '') +
                    (story.kr ? '<br><span style="font-family:Fredoka,sans-serif;font-size:11px;color:#a78bfa;direction:ltr;">' + story.kr + '</span>' : '') +
                '</div>';

            card.addEventListener('click', (function (id) {
                return function () { openStoryDetails(id); };
            })(story.id));

            container.appendChild(card);
        });
    }

    /* ══════════════════════════════════════════════
       6.  ensureStoryScreen — يبني الـ screen ديناميكياً
    ══════════════════════════════════════════════ */
    function ensureStoryScreen(idx) {
        if (document.getElementById('story-screen-' + idx)) return; /* موجود مسبقاً */

        /* حدد نوع القصة */
        var tabName  = getTabName(idx);
        var isHorror = (tabName === 'قصص رعب');

        /* حاول الحصول على العنوان */
        var kr = '', ar = '';
        if (typeof getStoryTitle === 'function') {
            var t = getStoryTitle(idx);
            kr = t.kr || '';
            ar = t.ar || '';
        }

        var screen = document.createElement('section');
        screen.id        = 'story-screen-' + idx;
        screen.className = 'story-view-screen' + (isHorror ? ' horror-story' : '');
        screen.style.display = 'none';

        screen.innerHTML =
            '<div class="story-web-layout">' +
                '<div class="story-sidebar ' + (isHorror ? 'dark-sidebar' : '') + '">' +
                    '<button class="story-back-web" onclick="switchToStoriesList()">' +
                        '<i class="fa-solid fa-arrow-right"></i> رجوع' +
                    '</button>' +
                    '<div class="story-meta-web">' +
                        '<h1>' + (kr || '📖') + '</h1>' +
                        '<p class="story-cat-tag ' + (isHorror ? 'horror-tag' : '') + '">' + tabName + '</p>' +
                    '</div>' +
                    '<button class="audio-btn-web" id="audioBtn' + idx + '" onclick="toggleAudio(' + idx + ')">' +
                        '<span id="btnContent' + idx + '"><i class="fa-solid fa-play"></i> تشغيل الصوت</span>' +
                    '</button>' +
                    '<div class="tts-status" id="ttsStatus' + idx + '"></div>' +
                    (ar ? '<div class="lesson web-lesson ' + (isHorror ? 'dark-lesson' : '') + '"><strong>📌 الدرس المستفاد</strong><br>' + ar + '</div>' : '') +
                    '<button class="done-btn-web" onclick="completeStoryAndGoBack()">أنهيت القصة بنجاح! 🎉</button>' +
                '</div>' +
                '<div class="story-content-web">' +
                    '<div class="story-container" id="storyText' + idx + '"></div>' +
                '</div>' +
            '</div>';

        document.querySelector('.main-wrapper').appendChild(screen);
    }

    function getTabName(idx) {
        /* القصص الأصلية 0-9 في index.html هي أطفال وممتعة */
        /* بعد دمج script.js: children=0, fun=1, emotional=2, horror=3 */
        /* نستعمل مصفوفة stories إذا كانت متاحة */
        if (typeof stories !== 'undefined') {
            for (var t = 0; t < stories.length; t++) {
                if (stories[t] && stories[t].some(function (s) { return s.id === idx; })) {
                    return ['قصص أطفال', 'قصص ممتعة', 'قصص عاطفية', 'قصص رعب'][t] || 'قصص';
                }
            }
        }
        return 'قصص';
    }

    /* ══════════════════════════════════════════════
       7.  buildStoryHTML — يبني نص القصة
    ══════════════════════════════════════════════ */
    function buildStoryHTML(idx, storyData, container) {
        if (!storyData || !container) return;
        var html = '';
        storyData.forEach(function (sentence, i) {
            if (sentence.kr) html += '<p class="kr-block"><span id="s' + idx + '_' + i + '" class="word">' + sentence.kr + '</span></p>';
            if (sentence.ar) html += '<p class="ar-block">' + sentence.ar + '</p>';
        });
        container.innerHTML = html;
    }

    /* ══════════════════════════════════════════════
       8.  initStories override — يحشو النصوص للـ screens الموجودة
    ══════════════════════════════════════════════ */
    window.initStories = function () {
        if (typeof allStories === 'undefined') return;
        allStories.forEach(function (storyData, idx) {
            var textEl = document.getElementById('storyText' + idx);
            if (textEl && textEl.innerHTML.trim() === '') {
                buildStoryHTML(idx, storyData, textEl);
            }
        });
    };

    /* ══════════════════════════════════════════════
       9.  تتبع إكمال القصص (يُستخدم في renderStoriesGrid وcompleteStoryAndGoBack)
    ══════════════════════════════════════════════ */
    window.isStoryCompleted = function (idx) {
        var stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        return Array.isArray(stored.completedStoryIds) && stored.completedStoryIds.indexOf(idx) !== -1;
    };

    window.saveStoryCompletion = function (idx) {
        var stored = (typeof getAchievements === 'function')
            ? getAchievements()
            : JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        if (!Array.isArray(stored.completedStoryIds)) stored.completedStoryIds = [];
        if (stored.completedStoryIds.indexOf(idx) === -1) {
            stored.completedStoryIds.push(idx);
            stored.storiesCompleted = (stored.storiesCompleted || 0) + 1;
            stored.xp = (stored.xp || 0) + 20;
            if (typeof checkBadges === 'function') checkBadges(stored);
        }
        if (typeof saveAchievements === 'function') {
            saveAchievements(stored);
        } else {
            localStorage.setItem('korean_app_achievements', JSON.stringify(stored));
        }
    };

    /* ══════════════════════════════════════════════
       10. completeStoryAndGoBack
    ══════════════════════════════════════════════ */
    window.completeStoryAndGoBack = function () {
        var idx = _currentStoryIdx;
        if (idx >= 0 && typeof saveStoryCompletion === 'function') {
            saveStoryCompletion(idx);
        }
        typeof stopAllAudio === 'function' && stopAllAudio();
        typeof cancelTTS    === 'function' && cancelTTS();

        showToast('🎉 أحسنت! تم حفظ تقدمك');
        setTimeout(function () {
            switchToStoriesList();
            updateHeroStats();
        }, 600);
    };

    /* ══════════════════════════════════════════════
       11. Profile
    ══════════════════════════════════════════════ */
    window.loadProfile = function () {
        var stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');

        var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };

        set('userName',    stored.userName   || 'متعلم');
        set('userAvatar',  stored.userAvatar || '😊');
        set('streakDays',  stored.streakDays || 0);

        var days = stored.streakDays || 0;
        set('streakMessage',
            days === 0  ? 'ابدأ رحلتك اليوم!'       :
            days < 7    ? 'استمر، أنت تتحسن!'        :
            days < 30   ? 'رائع! أسبوع من التعلم!'   :
                          '🏆 أنت أسطورة!');

        set('totalHours',     Math.floor((stored.xp || 0) / 10));
        set('completionRate', Math.round(((stored.storiesCompleted || 0) / 40) * 100) + '%');
        set('totalItems',     (stored.storiesCompleted || 0) + (stored.listeningCompleted || 0) + (stored.writingCompleted || 0));
    };

    window.openEditProfile = function () {
        var sec = document.getElementById('editProfileSection');
        if (sec) { sec.style.display = 'block'; sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        var stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        var inp = document.getElementById('customName');
        if (inp) inp.value = stored.userName || '';
        document.querySelectorAll('.avatar-option').forEach(function (o) {
            o.classList.toggle('selected', o.dataset.avatar === (stored.userAvatar || '😊'));
        });
    };

    window.closeEditProfile = function () {
        var sec = document.getElementById('editProfileSection');
        if (sec) sec.style.display = 'none';
    };

    window.saveCustomProfile = function () {
        var stored = JSON.parse(localStorage.getItem('korean_app_achievements') || '{}');
        var inp = document.getElementById('customName');
        var sel = document.querySelector('.avatar-option.selected');
        if (inp && inp.value.trim()) stored.userName = inp.value.trim();
        if (sel) stored.userAvatar = sel.dataset.avatar;
        localStorage.setItem('korean_app_achievements', JSON.stringify(stored));
        closeEditProfile();
        window.loadProfile();
        updateHeroStats();
        showToast('✅ تم حفظ التغييرات!');
    };

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('avatar-option')) {
            document.querySelectorAll('.avatar-option').forEach(function (o) { o.classList.remove('selected'); });
            e.target.classList.add('selected');
        }
    });

    window.handleLogout = function () {
        if (!confirm('إعادة تعيين كل التقدم؟ لا يمكن التراجع.')) return;
        ['korean_app_achievements','used_tips','used_topik','used_motivations'].forEach(function (k) {
            localStorage.removeItem(k);
        });
        showToast('♻️ تم إعادة تعيين التقدم');
        window.loadProfile();
        loadAchievements && loadAchievements();
        updateHeroStats();
    };

    /* ══════════════════════════════════════════════
       12. روابط الوحدات الأخرى
    ══════════════════════════════════════════════ */
    window.goToChatWithDelay = function () { setTimeout(function () { window.location.href = 'chat.html'; }, 300); };
    window.openReading       = function () { setTimeout(function () { window.location.href = 'reading-menu.html'; }, 300); };
    window.openListening     = function () { setTimeout(function () { window.location.href = 'listening-system.html'; }, 300); };
    window.openWriting       = function () { setTimeout(function () { window.location.href = 'writing-system.html'; }, 300); };

    /* ══════════════════════════════════════════════
       13. Toast
    ══════════════════════════════════════════════ */
    window.showToast = window.showStoryToast = function (msg) {
        var t = document.getElementById('toastWeb');
        if (t) {
            t.textContent = msg;
            t.classList.add('show');
            setTimeout(function () { t.classList.remove('show'); }, 3000);
        }
    };

    /* ══════════════════════════════════════════════
       14. Stubs
    ══════════════════════════════════════════════ */
    window.bindNavigationEvents = function () {};

    /* ══════════════════════════════════════════════
       15. التهيئة عند تحميل الصفحة
    ══════════════════════════════════════════════ */
    window.addEventListener('load', function () {
        document.body.style.visibility = 'visible';

        /* أظهر الرئيسية فقط */
        document.querySelectorAll('.page-screen').forEach(function (s) {
            s.classList.toggle('active-screen', s.id === 'home-screen');
        });
        document.querySelectorAll('.story-view-screen').forEach(function (s) {
            s.style.display = 'none';
        });

        /* حشو بيانات كل الـ screens الموجودة في HTML (0-19) */
        if (typeof allStories !== 'undefined') {
            allStories.forEach(function (data, idx) {
                var el = document.getElementById('storyText' + idx);
                if (el && el.innerHTML.trim() === '') buildStoryHTML(idx, data, el);
            });
        }

        /* تحميل البيانات الأولية */
        setTimeout(function () {
            loadLearnContent  && loadLearnContent();
            loadAchievements  && loadAchievements();
            window.loadProfile();
            updateHeroStats();
            loadStoriesPreview();
        }, 200);

        /* إذا كان URL يحتوي go=stories */
        if (window.location.search.includes('go=stories')) {
            history.replaceState(null, '', window.location.pathname);
            setTimeout(switchToStoriesScreen, 400);
        }

        console.log('✅ web-adapter v2 ready');
    });

})();

