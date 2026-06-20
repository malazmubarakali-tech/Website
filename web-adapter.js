/* ================================================================
   web-adapter.js  —  النسخة النهائية المصلحة بالكامل
   ================================================================ */
(function () {
'use strict';

/* ── متغيرات عامة ── */
window.currentTab   = 0;
var _activeStory    = -1;   // index القصة المفتوحة حالياً

/* ================================================================
   1.  أدوات مساعدة
   ================================================================ */
function q(id){ return document.getElementById(id); }

function hideAll(){
    document.querySelectorAll('.page-screen').forEach(function(s){
        s.style.display = 'none';
        s.classList.remove('active-screen');
    });
    document.querySelectorAll('.story-page').forEach(function(s){
        s.style.display = 'none';
    });
}

/* ================================================================
   2.  showScreen  —  يُظهر شاشة رئيسية (home/learn/achievements/profile/stories)
   ================================================================ */
window.showScreen = function(id){
    hideAll();
    var el = q(id + '-screen');
    if(el){ el.style.display = 'block'; el.classList.add('active-screen'); }

    /* تحديث الـ navbar */
    document.querySelectorAll('.nav-item').forEach(function(t){ t.classList.remove('active'); });
    var tab = document.querySelector('[data-target="' + id + '"]');
    if(tab) tab.classList.add('active');

    window.scrollTo({top:0, behavior:'smooth'});

    /* تحميل البيانات */
    if(id === 'achievements') setTimeout(function(){ typeof loadAchievements==='function' && loadAchievements(); }, 60);
    if(id === 'learn')        setTimeout(function(){ typeof loadLearnContent==='function'  && loadLearnContent(); },  60);
    if(id === 'profile')      setTimeout(function(){ loadProfile(); }, 60);
    if(id === 'home')         setTimeout(updateHeroStats, 60);
    if(id === 'stories')      setTimeout(function(){ window.showTab(window.currentTab || 0); }, 80);
};

/* ================================================================
   3.  التنقل
   ================================================================ */
window.switchToMainScreen    = function(){ stopMedia(); showScreen('home'); };
window.switchToStoriesScreen = function(){ showScreen('stories'); };
window.goToStoriesWithDelay  = function(){ setTimeout(switchToStoriesScreen, 300); };

window.switchToStoriesList = function(){
    stopMedia();
    hideAll();
    var el = q('stories-screen');
    if(el){ el.style.display='block'; el.classList.add('active-screen'); }
    document.querySelectorAll('.nav-item').forEach(function(t){ t.classList.remove('active'); });
    window.scrollTo({top:0, behavior:'smooth'});
    setTimeout(function(){ window.showTab(window.currentTab || 0); }, 80);
};

function stopMedia(){
    typeof stopAllAudio === 'function' && stopAllAudio();
    typeof cancelTTS    === 'function' && cancelTTS();
}

/* ================================================================
   4.  openStoryDetails  —  القلب: يفتح صفحة قصة منفصلة
   ================================================================ */
window.openStoryDetails = function(idx){
    _activeStory = idx;
    stopMedia();
    hideAll();

    /* أنشئ الصفحة إذا لم تكن موجودة */
    ensureStoryPage(idx);

    var page = q('sp-' + idx);
    if(!page){ console.warn('story page not found:', idx); return; }
    page.style.display = 'block';

    /* احشو النص */
    var box = q('storyText' + idx);
    if(box && box.innerHTML.trim() === '' && typeof allStories !== 'undefined' && allStories[idx]){
        fillStoryText(idx, allStories[idx], box);
    }

    window.scrollTo({top:0, behavior:'smooth'});
    document.querySelectorAll('.nav-item').forEach(function(t){ t.classList.remove('active'); });
};

/* ================================================================
   5.  ensureStoryPage  —  ينشئ عنصر .story-page ديناميكياً
   ================================================================ */

/* بيانات ثابتة للقصص 0-19 (موجودة في index.html كـ section) — نستخرج منها العنوان والدرس */
var STORY_META = {
    0:  { kr:'💨 방귀쟁이 며느리', tab:'قصص أطفال',   dark:false, lesson:'الصدق والطبيعة أساس الراحة. ما تعتبره عيباً قد يكون مصدر قوتك الحقيقية.' },
    1:  { kr:'🐰🐢 토끼와 거북이', tab:'قصص أطفال',   dark:false, lesson:'النجاح لا يحتاج سرعة، يحتاج استمراراً. اللي يكمل للنهاية يفوز.' },
    2:  { kr:'🐦 흥부와 놀부',      tab:'قصص أطفال',   dark:false, lesson:'الطيب والخير يرجعان لصاحبهما. ازرع الخير بنية صادقة ولا تحسد.' },
    3:  { kr:'🐰🐯 토끼와 호랑이',  tab:'قصص أطفال',   dark:false, lesson:'القوة البدنية وحدها لا تكفي. الذكاء والهدوء يهزمان أي خطر.' },
    4:  { kr:'💧 젊어지는 샘물',    tab:'قصص أطفال',   dark:false, lesson:'الطمع والجشع دائماً يؤديان لنتائج عكسية. القناعة كنز لا يفنى.' },
    5:  { kr:'🍉 당나귀 알',        tab:'قصص أطفال',   dark:false, lesson:'العلم والمعرفة ضروريان. اسأل أهل الخبرة قبل أن تنخدع.' },
    6:  { kr:'🧂 요술 맷돌',        tab:'قصص أطفال',   dark:false, lesson:'الطمع والسرقة لا يجلبان إلا الهلاك. القناعة راحة.' },
    7:  { kr:'⚖️ 토끼의 재판',      tab:'قصص ممتعة',  dark:false, lesson:'الذكاء ينتصر على القوة الغاشمة. العقل هو أقوى سلاح.' },
    8:  { kr:'🐓 수탉과 왕관',      tab:'قصص ممتعة',  dark:false, lesson:'لا تنخدع بكلام المتملقين. الغرور يؤدي إلى الخسارة.' },
    9:  { kr:'🐭 생쥐들과 방울',    tab:'قصص ممتعة',  dark:false, lesson:'أفضل الخطط لا قيمة لها بدون الشجاعة لتنفيذها.' },
    10: { kr:'👁️ 사각지대',         tab:'قصص رعب',    dark:true,  lesson:'الرعب الحقيقي لا يأتي من الخارج، بل من أعماق النفس البشرية.' },
    11: { kr:'🛏️ 7번 병상',         tab:'قصص رعب',    dark:true,  lesson:'العقل البشري قد يكون أعظم سجّان لنفسه.' },
    12: { kr:'📞 집 안에서 걸려 온 전화', tab:'قصص رعب', dark:true, lesson:'الخطر قد يكون مختبئاً في ظلال منازلنا.' },
    13: { kr:'👂 이식된 목소리',     tab:'قصص رعب',    dark:true,  lesson:'التكنولوجيا قد تسمح لنا بسماع ما لم يُخلق لنا أن نسمعه.' },
    14: { kr:'📄 하얀 페이지',       tab:'قصص رعب',    dark:true,  lesson:'هل نحن بشر حقيقيون أم مجرد سطور في محاكاة؟' },
    15: { kr:'🛗 잃어버린 층',       tab:'قصص رعب',    dark:true,  lesson:'هناك عوالم تعيش بين طيات واقعنا، لا تنزل في المحطة الخطأ.' },
    16: { kr:'🧱 벽 속의 손님',      tab:'قصص رعب',    dark:true,  lesson:'العقل المنعزل قد يخلق حقيقة بديلة كاملة ليهرب من الوحدة.' },
    17: { kr:'📻 한밤의 라디오 방송', tab:'قصص رعب',   dark:true,  lesson:'كم من الأصوات التي نسمعها يومياً هي حقيقية حقاً؟' },
    18: { kr:'⚖️ 과도한 무게',       tab:'قصص رعب',    dark:true,  lesson:'أكثر الكوابيس رعباً تأتي من المساحات التي نعتقد أنها آمنة.' },
    19: { kr:'🖼️ 움직이는 그림',     tab:'قصص رعب',    dark:true,  lesson:'بعض النظرات تبقى محفورة في الذاكرة للأبد.' }
};

function getStoryMeta(idx){
    if(STORY_META[idx]) return STORY_META[idx];

    /* للقصص الديناميكية 20-39: اقرأ من مصفوفة stories */
    var tab = 'قصص', kr = '📖', dark = false, lesson = '';
    if(typeof stories !== 'undefined'){
        for(var t = 0; t < stories.length; t++){
            if(!stories[t]) continue;
            for(var s = 0; s < stories[t].length; s++){
                if(stories[t][s].id === idx){
                    kr = stories[t][s].titleKR || kr;
                    tab = ['قصص أطفال','قصص ممتعة','قصص عاطفية','قصص رعب'][t] || tab;
                    dark = (t === 3);
                    break;
                }
            }
        }
    }
    return { kr:kr, tab:tab, dark:dark, lesson:lesson };
}

function ensureStoryPage(idx){
    if(q('sp-' + idx)) return;   /* موجودة مسبقاً */

    var m    = getStoryMeta(idx);
    var dark = m.dark;

    var page = document.createElement('div');
    page.id        = 'sp-' + idx;
    page.className = 'story-page' + (dark ? ' story-page--dark' : '');
    page.style.display = 'none';

    page.innerHTML =
        /* ── شريط العودة ── */
        '<div class="sp-topbar">' +
            '<button class="sp-back-btn" onclick="switchToStoriesList()">' +
                '<i class="fa-solid fa-arrow-right"></i> رجوع للقصص' +
            '</button>' +
            '<span class="sp-tab-badge">' + m.tab + '</span>' +
        '</div>' +

        /* ── بطاقة القصة ── */
        '<div class="sp-card">' +

            /* عنوان */
            '<div class="sp-title-row">' +
                '<h1 class="sp-title">' + m.kr + '</h1>' +
            '</div>' +

            /* زر الصوت */
            '<button class="sp-audio-btn" id="audioBtn' + idx + '" onclick="toggleAudio(' + idx + ')">' +
                '<span id="btnContent' + idx + '">' +
                    '<i class="fa-solid fa-play"></i> تشغيل الصوت' +
                '</span>' +
            '</button>' +
            '<div class="sp-tts-status" id="ttsStatus' + idx + '"></div>' +

            /* نص القصة */
            '<div class="sp-story-scroll">' +
                '<div class="sp-story-text" id="storyText' + idx + '"></div>' +
            '</div>' +

            /* الدرس المستفاد */
            (m.lesson ? '<div class="sp-lesson">' +
                '<strong>📌 الدرس المستفاد</strong><br>' + m.lesson +
            '</div>' : '') +

            /* زر الإنهاء */
            '<button class="sp-done-btn" onclick="completeStoryAndGoBack()">' +
                'أنهيت القصة بنجاح! 🎉' +
            '</button>' +

        '</div>';  /* end sp-card */

    document.querySelector('.main-wrapper').appendChild(page);
}

/* ================================================================
   6.  fillStoryText  —  يبني نص القصة داخل الحاوية
   ================================================================ */
function fillStoryText(idx, data, container){
    if(!data || !container) return;
    var html = '';
    data.forEach(function(s, i){
        if(s.kr) html += '<p class="sp-kr kr-block" id="s' + idx + '_' + i + '">' + s.kr + '</p>';
        if(s.ar) html += '<p class="sp-ar ar-block">' + s.ar + '</p>';
    });
    container.innerHTML = html;
}

/* ================================================================
   7.  showTab  —  يعرض تاب في مكتبة القصص
   ================================================================ */
window.showTab = function(idx){
    window.currentTab = idx;
    document.querySelectorAll('.stab').forEach(function(t,i){ t.classList.toggle('active', i===idx); });
    renderGrid(idx);
};

function renderGrid(tabIdx){
    var box = q('content');
    if(!box) return;
    box.innerHTML = '';

    if(typeof stories === 'undefined' || !stories[tabIdx] || !stories[tabIdx].length){
        box.innerHTML = '<p class="grid-empty">لا توجد قصص هنا بعد</p>';
        return;
    }

    stories[tabIdx].forEach(function(story){
        if(!story || story.id === -1) return;
        var emoji  = (typeof emojis !== 'undefined' && emojis[story.id]) ? emojis[story.id] : '📖';
        var done   = isCompleted(story.id);
        var card   = document.createElement('div');
        card.className = 'story-card' + (done ? ' story-card--done' : '');
        card.innerHTML =
            '<div class="sc-emoji">' + emoji + (done ? '<span class="sc-check">✅</span>' : '') + '</div>' +
            '<div class="sc-title">' + (story.titleAR || '') + '</div>' +
            '<div class="sc-kr">'   + (story.titleKR || '') + '</div>';
        card.addEventListener('click', (function(id){ return function(){ openStoryDetails(id); }; })(story.id));
        box.appendChild(card);
    });
}

/* ================================================================
   8.  completeStoryAndGoBack
   ================================================================ */
window.completeStoryAndGoBack = function(){
    if(_activeStory >= 0){
        var d = getAchievements();
        d.storiesCompleted = (d.storiesCompleted || 0) + 1;
        d.xp = (d.xp || 0) + 20;
        if(!d.completedList) d.completedList = [];
        if(d.completedList.indexOf(_activeStory) === -1) d.completedList.push(_activeStory);
        checkBadges(d);
        saveAchievements(d);
    }
    stopMedia();
    showToastMsg('🎉 أحسنت! تم حفظ تقدمك');
    setTimeout(function(){
        switchToStoriesList();
        updateHeroStats();
    }, 600);
};

/* ================================================================
   9.  مساعدات الإنجازات
   ================================================================ */
function isCompleted(id){
    var d = getAchievements();
    return d.completedList && d.completedList.indexOf(id) !== -1;
}
window.isStoryCompleted = isCompleted;

/* ================================================================
   10. الملف الشخصي
   ================================================================ */
window.loadProfile = function(){
    var d = getAchievements();
    setText('userName',    d.userName  || 'متعلم');
    setText('userAvatar',  d.userAvatar|| '😊');
    setText('streakDays',  d.streakDays|| 0);
    var days = d.streakDays || 0;
    setText('streakMessage',
        days===0   ? 'ابدأ رحلتك اليوم!'      :
        days < 7   ? 'استمر، أنت تتحسن!'       :
        days < 30  ? 'رائع! أسبوع من التعلم!'  : '🏆 أنت أسطورة!');
    setText('totalHours',     Math.floor((d.xp||0)/10));
    setText('completionRate', Math.round(((d.storiesCompleted||0)/40)*100) + '%');
    setText('totalItems',     (d.storiesCompleted||0)+(d.listeningCompleted||0)+(d.writingCompleted||0));
};

function setText(id,val){ var el=q(id); if(el) el.textContent=val; }

window.openEditProfile = function(){
    var sec=q('editProfileSection');
    if(sec){ sec.style.display='block'; sec.scrollIntoView({behavior:'smooth',block:'nearest'}); }
    var d=getAchievements();
    var inp=q('customName'); if(inp) inp.value=d.userName||'';
    document.querySelectorAll('.avatar-option').forEach(function(o){
        o.classList.toggle('selected', o.dataset.avatar===(d.userAvatar||'😊'));
    });
};
window.closeEditProfile = function(){
    var sec=q('editProfileSection'); if(sec) sec.style.display='none';
};
window.saveCustomProfile = function(){
    var d=getAchievements();
    var inp=q('customName');   if(inp&&inp.value.trim()) d.userName=inp.value.trim();
    var sel=document.querySelector('.avatar-option.selected'); if(sel) d.userAvatar=sel.dataset.avatar;
    saveAchievements(d);
    window.closeEditProfile();
    window.loadProfile();
    updateHeroStats();
    showToastMsg('✅ تم حفظ التغييرات!');
};
document.addEventListener('click',function(e){
    if(e.target.classList.contains('avatar-option')){
        document.querySelectorAll('.avatar-option').forEach(function(o){ o.classList.remove('selected'); });
        e.target.classList.add('selected');
    }
});
window.handleLogout = function(){
    if(!confirm('إعادة تعيين كل التقدم؟ لا يمكن التراجع.')) return;
    ['korean_app_achievements','used_tips','used_topik','used_motivations'].forEach(function(k){
        localStorage.removeItem(k);
    });
    showToastMsg('♻️ تم إعادة تعيين التقدم');
    window.loadProfile(); loadAchievements && loadAchievements(); updateHeroStats();
};

/* ================================================================
   11. Toast
   ================================================================ */
function showToastMsg(msg){
    var t=q('toastWeb');
    if(t){ t.textContent=msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },3000); }
}
window.showToast      = showToastMsg;
window.showStoryToast = showToastMsg;

/* ================================================================
   12. روابط الوحدات الأخرى
   ================================================================ */
window.goToChatWithDelay = function(){ setTimeout(function(){ window.location.href='chat.html'; },300); };
window.openReading       = function(){ setTimeout(function(){ window.location.href='reading-menu.html'; },300); };
window.openListening     = function(){ setTimeout(function(){ window.location.href='listening-system.html'; },300); };
window.openWriting       = function(){ setTimeout(function(){ window.location.href='writing-system.html'; },300); };

/* stubs */
window.bindNavigationEvents = function(){};
window.initStories = function(){
    if(typeof allStories==='undefined') return;
    allStories.forEach(function(data,idx){
        var el=q('storyText'+idx);
        if(el && el.innerHTML.trim()==='' && data) fillStoryText(idx,data,el);
    });
};

/* ================================================================
   13. التهيئة عند تحميل الصفحة
   ================================================================ */
window.addEventListener('load', function(){
    /* أخفِ كل شيء وأظهر الرئيسية */
    document.querySelectorAll('.page-screen').forEach(function(s){
        var isHome = s.id==='home-screen';
        s.style.display = isHome ? 'block' : 'none';
        s.classList.toggle('active-screen', isHome);
    });
    /* أخفِ الـ section القديمة للقصص (story-view-screen) كانت موجودة في index القديم */
    document.querySelectorAll('.story-view-screen').forEach(function(s){ s.style.display='none'; });

    setTimeout(function(){
        typeof loadLearnContent==='function' && loadLearnContent();
        loadAchievements && loadAchievements();
        window.loadProfile();
        updateHeroStats();
        loadStoriesPreview();
    },200);

    if(sessionStorage.getItem('openStories')==='true'){
        sessionStorage.removeItem('openStories');
        setTimeout(switchToStoriesScreen,400);
    } else if(window.location.search.includes('go=stories')){
        history.replaceState(null,'',window.location.pathname);
        setTimeout(switchToStoriesScreen,400);
    }
    console.log('✅ web-adapter v3 ready');
});

})();
