// ============ إعدادات الصوت والقراءة ============
let audioPlayer = new Audio(), isAudioMode = false, timestampCheckTimer = null, lastHighlightedSentence = -1;
let storySpeech = null, currentUtterance = null, activeStoryId = -1, currentSentenceIdx = 0, isPlaying = false, wordTimer = null;
let storyPausePosition = {};
let currentTab = 0;

// ===== تفعيل TTS عند أول نقرة =====
document.addEventListener('click', function initTTS() {
    if ('speechSynthesis' in window) {
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        speechSynthesis.speak(dummy);
    }
}, { once: true });

function loadVoices(){if('speechSynthesis' in window){storySpeech=window.speechSynthesis;storySpeech.getVoices();return true}return false}
function speakSentence(text,callback){if(!storySpeech)loadVoices();if(!storySpeech){if(callback)callback();return};storySpeech.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=0.75;u.pitch=1.0;u.volume=1.0;const voices=storySpeech.getVoices();const kv=voices.find(v=>v.lang.includes('ko'));if(kv)u.voice=kv;var ended=false;u.onend=function(){if(!ended){ended=true;if(callback)callback()}};u.onerror=function(){if(!ended){ended=true;if(callback)callback()}};setTimeout(function(){if(!ended){ended=true;if(callback)callback()}},20000);currentUtterance=u;storySpeech.speak(u)}

function toggleAudio(storyIdx){
    if(storyAudioFiles[storyIdx]){
        if(isPlaying && activeStoryId === storyIdx && isAudioMode){
            audioPlayer.pause();
            storyPausePosition[storyIdx] = audioPlayer.currentTime;
            isPlaying = false;
            stopTimestampCheck();
            setPausedUI(storyIdx);
            showStoryToast('⏸ تم الإيقاف المؤقت - سيتم الاستئناف من نفس المكان');
            return;
        }
        if(storyPausePosition[storyIdx] && activeStoryId === storyIdx){
            audioPlayer.currentTime = storyPausePosition[storyIdx];
        }
        if(isPlaying){
            stopAllAudio();
            if(activeStoryId !== storyIdx) resetBtnUI(activeStoryId);
        }
        activeStoryId = storyIdx;
        isPlaying = true;
        isAudioMode = true;
        lastHighlightedSentence = -1;
        currentSentenceIdx = 0;
        setPlayingUI(storyIdx);
        if(!audioPlayer.src || audioPlayer.src !== storyAudioFiles[storyIdx]){
            audioPlayer.src = storyAudioFiles[storyIdx];
            if(storyPausePosition[storyIdx]){
                audioPlayer.currentTime = storyPausePosition[storyIdx];
            }
        }
        audioPlayer.play();
        if(storyTimestamps[storyIdx]) startTimestampCheck(storyIdx);
        audioPlayer.onended = function(){
            stopAllAudio();
            stopTimestampCheck();
            resetBtnUI(storyIdx);
            delete storyPausePosition[storyIdx];
            showStoryToast('✅ انتهت القصة!');
        };
        audioPlayer.onerror = function(){
            stopAllAudio();
            stopTimestampCheck();
            resetBtnUI(storyIdx);
            showStoryToast('⚠️ خطأ في تحميل الصوت');
        };
        return;
    }
    // ===== وضع TTS =====
    if (!('speechSynthesis' in window)) {
        showToast('⚠️ المتصفح لا يدعم النطق الصوتي');
        return;
    }
    if(isPlaying && activeStoryId === storyIdx && !isAudioMode){
        stopAudio();
        setPausedUI(storyIdx);
        showStoryToast('⏸ تم الإيقاف المؤقت');
        return;
    }
    if(isPlaying && activeStoryId !== storyIdx){
        stopAudio();
        resetBtnUI(activeStoryId);
    }
    isPlaying = true;
    activeStoryId = storyIdx;
    isAudioMode = false;
    currentSentenceIdx = storyPausePosition[storyIdx] || 0;
    setPlayingUI(storyIdx);
    playNext();
}

function startTimestampCheck(storyIdx){
    stopTimestampCheck();
    lastHighlightedSentence = -1;
    timestampCheckTimer = setInterval(function(){
        if(!isPlaying || !isAudioMode) return;
        const ct = audioPlayer.currentTime;
        const ts = storyTimestamps[storyIdx];
        if(!ts) return;
        let found = -1;
        for(let i = 0; i < ts.length; i++){
            if(ct >= ts[i].start && ct <= ts[i].end){
                found = i;
                break;
            }
        }
        if(found !== -1 && found !== lastHighlightedSentence){
            lastHighlightedSentence = found;
            currentSentenceIdx = found;
            highlightSentencePurple(storyIdx, found);
        }
    }, 150);
}

function stopTimestampCheck(){
    if(timestampCheckTimer){
        clearInterval(timestampCheckTimer);
        timestampCheckTimer = null;
    }
    lastHighlightedSentence = -1;
}

function highlightSentencePurple(storyIdx, sentIdx){
    const container = document.getElementById('storyText' + storyIdx);
    if(!container) return;
    const allKr = container.querySelectorAll('.kr-block');
    const allAr = container.querySelectorAll('.ar-block');
    allKr.forEach(kr => { kr.style.background = 'transparent'; kr.style.borderRadius = '0'; kr.style.padding = '0'; });
    allAr.forEach(ar => { ar.style.opacity = '0.4'; ar.style.fontWeight = '500'; });
    if(allKr[sentIdx]){
        allKr[sentIdx].style.background = 'rgba(147,112,219,0.25)';
        allKr[sentIdx].style.borderRadius = '10px';
        allKr[sentIdx].style.padding = '6px 10px';
    }
    if(allAr[sentIdx]){
        allAr[sentIdx].style.opacity = '1';
        allAr[sentIdx].style.fontWeight = '900';
        allAr[sentIdx].scrollIntoView({behavior:'smooth', block:'center'});
    }
}

function stopAllAudio(){
    isPlaying = false;
    isAudioMode = false;
    stopTimestampCheck();
    if(audioPlayer){
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    if(storySpeech) try{ storySpeech.cancel(); } catch(e){}
    if(wordTimer !== null){
        clearInterval(wordTimer);
        wordTimer = null;
    }
}

function playNext(){
    if(!isPlaying) return;
    if(wordTimer !== null){ clearInterval(wordTimer); wordTimer = null; }
    const data = allStories[activeStoryId];
    if(!data || currentSentenceIdx >= data.length){
        stopAudio();
        resetBtnUI(activeStoryId);
        return;
    }
    const container = document.getElementById('storyText' + activeStoryId);
    if(container) container.querySelectorAll('.word').forEach(w => w.classList.remove('active-word'));
    
    // ✅ تمييز الجملة الحالية تماماً مثل القصص الصوتية
    highlightSentencePurple(activeStoryId, currentSentenceIdx);
    
    // نطق الجملة ثم الانتقال للتالية
    speakSentence(data[currentSentenceIdx].kr, function(){
        if(container) container.querySelectorAll('.word').forEach(w => w.classList.remove('active-word'));
        currentSentenceIdx++;
        if(isPlaying && currentSentenceIdx < data.length) setTimeout(function(){ playNext(); }, 400);
        else if(currentSentenceIdx >= data.length){ stopAudio(); resetBtnUI(activeStoryId); }
    });
}

function trackWords(storyIdx, sentIdx, text){
    // لم تعد مستخدمة، لكن نحتفظ بها لتجنب الأخطاء
}

function highlightCurrentSentence(storyIdx, sentIdx){
    const container = document.getElementById('storyText' + storyIdx);
    if(!container) return;
    const arBlocks = container.querySelectorAll('.ar-block');
    if(arBlocks[sentIdx]) arBlocks[sentIdx].scrollIntoView({behavior:'smooth', block:'center'});
}

function stopAudio(){
    isPlaying = false;
    isAudioMode = false;
    stopTimestampCheck();
    if(wordTimer !== null){
        clearInterval(wordTimer);
        wordTimer = null;
    }
    if(audioPlayer){
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
    }
    if(storySpeech) try{ storySpeech.cancel(); } catch(e){}
    currentUtterance = null;
}

function resetBtnUI(idx){
    const btn = document.getElementById('btnContent' + idx);
    const status = document.getElementById('ttsStatus' + idx);
    if(btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>تشغيل الصوت</span>';
    if(status) status.innerText = '';
}

function setPlayingUI(idx){
    const btn = document.getElementById('btnContent' + idx);
    const status = document.getElementById('ttsStatus' + idx);
    if(btn) btn.innerHTML = '<div class="wave-bars"><span></span><span></span><span></span><span></span><span></span></div><span>إيقاف مؤقت</span>';
    if(status) status.innerText = '🎵 جارٍ التشغيل...';
}

function setPausedUI(idx){
    const btn = document.getElementById('btnContent' + idx);
    const status = document.getElementById('ttsStatus' + idx);
    if(btn) btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>متابعة التشغيل</span>';
    if(status) status.innerText = '⏸ متوقف مؤقتاً';
}

function cancelTTS(){ stopAudio(); }

// ============ دوال التنقل ============
// ملاحظة: showScreen / switchToMainScreen / switchToStoriesList / openStoryDetails /
// switchToStoriesScreen / openReading / openListening / openWriting / goToChatWithDelay
// معرّفة في web-adapter.js وتعمل بشكل صحيح مع هيكل الصفحة الحالي (page-screen / nav-item).
// تمت إزالة النسخ القديمة من هنا لأنها كانت مكتوبة لهيكل HTML قديم مختلف
// (تستخدم كلاسات .app-screen / .navigation-tab وعنصر #bottomNav غير الموجودين في هذه الصفحة)
// وكانت تُحمَّل بعد web-adapter.js فتستبدل النسخة الصحيحة بنسخة معطوبة، مما كان يمنع
// تبديل الشاشات (وبالتالي يمنع التمرير التلقائي عند الضغط على "حسابي"/"تعلم"/إلخ)
// ويكسر فتح وتشغيل القصص.

// ============ المحتوى التعليمي ============
const tips=["حاول أن تتعلم 5 كلمات جديدة يوميًا واستخدمها في جمل.","شاهد مسلسلات كورية بترجمة كورية لتحسين مهاراتك.","استخدم تطبيق المذكرات لكتابة يومياتك باللغة الكورية.","كرر الكلمات بصوت عالٍ لتثبيت النطق الصحيح.","خصص 10 دقائق يوميًا لمراجعة المفردات القديمة.","حاول التفكير باللغة الكورية بدلاً من الترجمة الحرفية.","اقرأ قصص الأطفال بالكورية، فمفرداتها بسيطة ومفيدة.","استمع إلى الأغاني الكورية وحاول كتابة الكلمات التي تسمعها.","شارك في مجموعات تعلم اللغة الكورية على الإنترنت للممارسة.","لا تخف من الأخطاء، فكل خطأ هو خطوة نحو الإتقان.","ضع أهدافًا أسبوعية صغيرة، مثل حفظ 30 كلمة جديدة.","حاول أن تقرأ مقالاً إخباريًا بالكورية مرة في الأسبوع.","اكتب منشورات قصيرة بالكورية على وسائل التواصل الاجتماعي.","شاهد مقاطع يوتيوب تعليمية عن القواعد الكورية.","استخدم خاصية الترجمة في هاتفك لممارسة النطق.","حاول التحدث مع متحدثين أصليين عبر تطبيقات التبادل اللغوي.","خصص دفترًا للمفردات الصعبة وراجعها بانتظام.","تعلم جملة كورية كاملة بدلاً من كلمة واحدة في كل مرة.","استمع إلى البودكاست الكوري أثناء المشي أو القيادة.","جرب كتابة تعليقات بالكورية على منشورات أصدقائك الكوريين."];
const topikFacts=["امتحان TOPIK I يتكون من 30 سؤال استماع و 30 سؤال قراءة، ومدة الاختبار 100 دقيقة.","امتحان TOPIK II يتكون من 50 سؤال استماع، 4 أسئلة كتابة، و 50 سؤال قراءة. مدته 180 دقيقة.","للحصول على المستوى 3 في TOPIK II، يجب أن تحصل على 120 نقطة على الأقل من 300.","المستوى 6 (الأعلى) يتطلب 230 نقطة في TOPIK II.","تقام امتحانات TOPIK 6 مرات في السنة داخل كوريا، و 4 مرات خارجها.","نتائج الامتحان تبقى صالحة لمدة سنتين من تاريخ الإعلان.","يمكنك استخدام قاموس ورقي في قسم الكتابة فقط (TOPIK II).","السرعة مهمة جدًا في قسم القراءة؛ حاول أن لا تتجاوز دقيقة واحدة لكل سؤال.","الأسئلة 51-52 في الكتابة هي أسئلة إكمال فراغات، وهي أسهل جزء للحصول على نقاط.","الأسئلة 53-54 في الكتابة تتطلب كتابة نصوص طويلة (رسم بياني + مقال)، فتدرب عليها كثيرًا.","TOPIK I يمنح مستويين فقط: المستوى 1 (80 نقطة) والمستوى 2 (140 نقطة).","القسم الأصعب في TOPIK II هو الاستماع المتقدم (الأسئلة 21-50) حيث المحادثات طويلة ومعقدة.","يمكن استخدام اللغة الإنجليزية أو الكورية فقط في التعليمات داخل قاعة الامتحان.","يُسمح بدخول الامتحان بقلم رصاص فقط، ولا يُسمح بالأقلام الجافة أو الحبر.","نتيجة الامتحان تُعلن عادة بعد حوالي شهر من تاريخ الاختبار.","لا يوجد نجاح أو رسوب في TOPIK، بل تحصل على مستوى حسب درجتك.","في كوريا، يستخدم TOPIK للقبول الجامعي والتوظيف وطلب الإقامة الدائمة.","هناك كتب تحضيرية رسمية من المعهد الكوري للتعليم (NIIED) يمكنك تحميلها مجانًا.","الاستماع في TOPIK II يحتوي على مقاطع من نشرات الأخبار والبرامج الحوارية.","سؤال الكتابة 53 يعرض رسمًا بيانيًا ويطلب منك وصفه في 200-300 كلمة كورية."];
const motivations=["كل حرف تتعلمه يقرّبك من حلمك. لا تتوقف!","أنت اليوم أفضل من الأمس، وغدًا ستكون أفضل.","تذكر دائمًا لماذا بدأت، ولتكن هذه قوتك.","لا تقارن رحلتك برحلة الآخرين، فلكلٍ طريقه الخاص.","النجاح ليس نهاية، والفشل ليس قاتلًا، الشجاعة للاستمرار هي ما يهم.","الأشياء العظيمة تستغرق وقتًا، كن صبورًا مع نفسك.","كل دقيقة تقضيها في التعلم هي استثمار في مستقبلك.","أنت تتعلم واحدة من أصعب اللغات في العالم، وهذا إنجاز بحد ذاته!","تخيل نفسك تتحدث الكورية بطلاقة، هذا الحلم قريب جدًا.","العقبة الوحيدة بينك وبين هدفك هي القصة التي ترويها لنفسك.","لا تيأس، كل متحدث طليق بدأ من الصفر مثلك تمامًا.","فخور بك لأنك مستمر رغم الصعوبات.","قوة الإرادة تصنع المستحيل. ثق بنفسك.","ما تتعلمه اليوم سيصبح سلاحك غدًا.","رحلة تعلم اللغة ممتعة بقدر ما هي مفيدة، استمتع بها!","أنت لست وحدك، ملايين يتعلمون الكورية حول العالم.","لا يوجد وقت متأخر للبدء، كل لحظة هي فرصة جديدة.","ضع صورة لهدفك أمامك دائمًا لتذكرك لماذا تتعلم.","كلما شعرت بالإحباط، تذكر كم قطعت من طريق.","الاستسلام هو الهزيمة الوحيدة، أما التأخر في التقدم فهو طبيعي."];
function getNonRepeatingItem(arr, storageKey) { let used = JSON.parse(localStorage.getItem(storageKey) || '[]'); let available = arr.filter((_, i) => !used.includes(i)); if (available.length === 0) { used = []; available = [...arr]; } const randomAvailableIndex = Math.floor(Math.random() * available.length); const selectedItem = available[randomAvailableIndex]; const originalIndex = arr.indexOf(selectedItem); used.push(originalIndex); localStorage.setItem(storageKey, JSON.stringify(used)); return selectedItem; }
function refreshTip() { document.getElementById('tipText').textContent = getNonRepeatingItem(tips, 'used_tips'); }
function refreshTopik() { document.getElementById('topikText').textContent = getNonRepeatingItem(topikFacts, 'used_topik'); }
function refreshMotivation() { document.getElementById('motivationText').textContent = getNonRepeatingItem(motivations, 'used_motivations'); }
function loadLearnContent() { refreshTip(); refreshTopik(); refreshMotivation(); }

// ============ الإنجازات ============
function getAchievements() {
    const stored = localStorage.getItem('korean_app_achievements');
    return stored ? JSON.parse(stored) : { storiesCompleted:0, listeningCompleted:0, writingCompleted:0, xp:0, badges:[] };
}
function saveAchievements(data) { localStorage.setItem('korean_app_achievements', JSON.stringify(data)); }
function loadAchievements() {
    const data = getAchievements();
    const total = 40;
    const completed = Math.min(data.storiesCompleted, total);
    const percent = (completed / total) * 100;
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressCharacter').style.left = percent + '%';
    document.getElementById('progressText').textContent = completed + ' / ' + total;
    document.getElementById('statStories').textContent = data.storiesCompleted;
    document.getElementById('statXP').textContent = data.xp;
    document.getElementById('statListening').textContent = data.listeningCompleted || 0;
    document.getElementById('statWriting').textContent = data.writingCompleted || 0;
    const starsRow = document.getElementById('starsRow');
    starsRow.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const threshold = (i / 10) * total;
        const earned = completed >= threshold;
        starsRow.innerHTML += `<span class="star-icon" style="opacity:${earned ? 1 : 0.3};">⭐</span>`;
    }
    const allBadges = [
        { id: 'first-story', icon: '📖', name: 'قارئ مبتدئ' },
        { id: 'five-stories', icon: '🌟', name: 'قارئ نشط' },
        { id: 'all-stories', icon: '👑', name: 'ملك القصص' },
        { id: 'first-listen', icon: '🎧', name: 'مستمع' },
        { id: 'first-write', icon: '✍️', name: 'كاتب' }
    ];
    document.getElementById('badgesGrid').innerHTML = allBadges.map(b => {
        const unlocked = data.badges.includes(b.id);
        return `<div class="badge-item ${unlocked ? 'unlocked' : 'locked'}"><span class="badge-icon">${b.icon}</span><span class="badge-name">${b.name}</span></div>`;
    }).join('');
    const msgs = ["🐰 كل قصة تقرّبك من القمة!", "🌸 أنت تتقدم بثبات.. استمر!", "🍰 كل صفحة تزيدك قوة!", "🎀 الأرنب فخور بك!", "🌟 أنت تصنع المعجزات يومًا بعد يوم!", "🍭 تعلمك جميل مثل الحلوى!", "💖 الكورية تحبك وأنت تحبها!"];
    document.getElementById('encouragementMsg').textContent = msgs[Math.floor(Math.random() * msgs.length)];
}

// ============ القصص ============
const emojis = {
    0: '💨', 1: '🐢', 2: '🐦', 3: '🐯', 4: '💧',
    5: '🍉', 6: '🧂', 7: '⚖️', 8: '🐓', 9: '🐭',
    10: '👁️', 11: '🛏️', 12: '📞', 13: '👂', 14: '📄',
    15: '🛗', 16: '🧱', 17: '📻', 18: '⚖️', 19: '🖼️'
};

// ملاحظة: getStoryTitle / initStories / showTab / إنشاء كروت القصص وتفصيلها
// معرّفة في web-adapter.js (getStoryTitle, window.initStories, window.showTab,
// renderStoriesGrid, buildStoryHTML, ensureStoryScreen). تمت إزالة النسخ المكررة هنا.

// ============ الملف الشخصي ============
// ملاحظة: نظام الملف الشخصي (الاسم/الصورة الرمزية/الستريك) موحّد في web-adapter.js
// ويستخدم نفس مفتاح التخزين 'korean_app_achievements' المستخدم في باقي الصفحة (الإحصائيات
// في الصفحة الرئيسية وشاشة الإنجازات). تمت إزالة نظام قديم منفصل كان يخزن البيانات
// تحت مفاتيح مختلفة (user_profile/user_streak) فيتسبب بعدم تطابق البيانات بين الشاشات.

// ============ أحداث الصفحة ============
// استخدام تفويض الأحداث لزر "تم" ليشمل الأزرار المضافة ديناميكياً
document.addEventListener('click', function(e) {
    if (e.target.closest('.action-button-done')) {
        completeStoryAndGoBack();
    }
});

function checkBadges(data) {
    if (data.storiesCompleted >= 1 && !data.badges.includes('first-story')) {
        data.badges.push('first-story');
        showToast('🏅 شارة جديدة: قارئ مبتدئ!');
    }
    if (data.storiesCompleted >= 5 && !data.badges.includes('five-stories')) {
        data.badges.push('five-stories');
        showToast('🌟 شارة جديدة: قارئ نشط!');
    }
    if (data.storiesCompleted >= 10 && !data.badges.includes('all-stories')) {
        data.badges.push('all-stories');
        showToast('👑 شارة جديدة: ملك القصص!');
    }
}

function showToast(message) {
    const existingToast = document.querySelector('.custom-toast');
    if(existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#d63384,#c2185b);color:white;padding:10px 20px;border-radius:20px;font-weight:900;z-index:1000;animation:xpPop 0.5s ease, xpFadeOut 0.5s 2.5s forwards;box-shadow:0 4px 15px rgba(200,50,80,0.4);font-size:14px;font-family:\'Tajawal\',sans-serif;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
function showStoryToast(msg) {
    const existing = document.querySelector('.story-toast');
    if(existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'story-toast';
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#4a1528;color:#fff;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:700;z-index:1000;font-family:Tajawal,sans-serif;animation:xpPop 0.5s ease;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

window.addEventListener('load', function() {
    // ============ دمج بيانات القصص الإضافية (data2/data3/data4.js) ============
    // كل ملف بيانات معرّف أصلاً بمعرّفات (id) ثابتة لا تتغير:
    //   data.js  -> قصص الأطفال:   0-9
    //   data2.js -> قصص الرعب:     10-19  (مطابقة لشاشات story-screen-10..19 الموجودة في index.html)
    //   data3.js -> القصص العاطفية: 20-29
    //   data4.js -> القصص الممتعة:  30-39
    // لذلك يكفي الدمج المباشر بدون إعادة ترقيم؛ إعادة الترقيم القديمة هنا كانت
    // تحذف شاشات الرعب الجاهزة (10-19) وتعيد بناءها بقالب مختلف لا يطابق التنسيق (CSS)،
    // كما كانت تزيح أرقام قصص الرعب فتتعارض مع البطاقات المعروضة في الصفحة الرئيسية.

    if (typeof allStories3 !== 'undefined') { // قصص الرعب 10-19
        allStories3.forEach((story, i) => { allStories[10 + i] = story; });
        if (typeof storyTimestamps3 !== 'undefined') Object.assign(storyTimestamps, storyTimestamps3);
        if (typeof storyAudioFiles3 !== 'undefined') Object.assign(storyAudioFiles, storyAudioFiles3);
        if (typeof stories3 !== 'undefined') stories[3] = stories3;
    }

    if (typeof allStories2_emotional !== 'undefined') { // القصص العاطفية 20-29
        allStories2_emotional.forEach((story, i) => { allStories[20 + i] = story; });
        if (typeof storyTimestamps2_emotional !== 'undefined') Object.assign(storyTimestamps, storyTimestamps2_emotional);
        if (typeof storyAudioFiles2_emotional !== 'undefined') Object.assign(storyAudioFiles, storyAudioFiles2_emotional);
        if (typeof emotionalEmojis !== 'undefined') Object.assign(emojis, emotionalEmojis);
        if (typeof stories2_emotional !== 'undefined') stories[2] = stories2_emotional;
    }

    if (typeof allStories1_fun !== 'undefined') { // القصص الممتعة 30-39
        allStories1_fun.forEach((story, i) => { allStories[30 + i] = story; });
        if (typeof storyTimestamps1_fun !== 'undefined') Object.assign(storyTimestamps, storyTimestamps1_fun);
        if (typeof storyAudioFiles1_fun !== 'undefined') Object.assign(storyAudioFiles, storyAudioFiles1_fun);
        if (typeof funEmojis !== 'undefined') Object.assign(emojis, funEmojis);
        if (typeof stories1_fun !== 'undefined') stories[1] = stories1_fun;
    }

    // يملأ نصوص أي شاشة قصة موجودة (0-19) وتترك بناء شاشات 20-39 إلى ensureStoryScreen
    // في web-adapter.js عند فتحها لأول مرة (بالقالب والتنسيق الصحيحين).
    initStories();
    loadVoices();

    // الانتقال التلقائي لشاشة القصص القادم من زر "القصص" في reading-menu.html
    if (sessionStorage.getItem('openStories') === 'true') {
        sessionStorage.removeItem('openStories');
        switchToStoriesScreen();
    } else if (window.location.search.includes('go=stories')) {
        history.replaceState(null, '', window.location.pathname);
        switchToStoriesScreen();
    }

    console.log('✅ التطبيق جاهز');
});